use super::approval::cleanup_assets;
use super::model::{build_prompt, parse_step};
use super::protocol::{
    AgentEvent, AgentEventPayload, AgentRunResult, ModelAction, RunStatus, StartTurnRequest,
};
use super::state::{AgentRuntimeState, PendingApproval};
use super::tools::{self, ToolOutcome};
use crate::ai::AiManager;
use crate::error::AppError;
use crate::storage::Storage;
use std::sync::Arc;
use uuid::Uuid;

struct EventEmitter<F> {
    request_id: String,
    run_id: String,
    sequence: u64,
    sink: F,
}

impl<F: FnMut(AgentEventPayload)> EventEmitter<F> {
    fn emit(&mut self, event: AgentEvent) {
        self.sequence += 1;
        (self.sink)(AgentEventPayload {
            request_id: self.request_id.clone(),
            run_id: self.run_id.clone(),
            sequence: self.sequence,
            event,
        });
    }
}

pub async fn run_turn<F>(
    manager: &Arc<AiManager>,
    storage: &Storage,
    state: &AgentRuntimeState,
    request_id: String,
    request: StartTurnRequest,
    sink: F,
) -> Result<AgentRunResult, AppError>
where
    F: FnMut(AgentEventPayload),
{
    validate_request(&request)?;
    state.prepare_run(&request.run_id)?;
    let asset_paths = storage.resolve_asset_paths(&request.assets)?;
    let mut events = EventEmitter {
        request_id,
        run_id: request.run_id.clone(),
        sequence: 0,
        sink,
    };
    let mut observations = Vec::new();
    for step_index in 0..request.reasoning_effort.max_steps() {
        if state.is_cancelled(&request.run_id)? {
            return finish_cancelled(storage, state, &request, &mut events);
        }
        events.emit(AgentEvent::Status {
            label: if step_index == 0 {
                format!("{} 推理 · 正在理解任务", request.reasoning_effort.as_str())
            } else {
                format!("正在根据第 {step_index} 个工具结果继续思考")
            },
        });
        let prompt = build_prompt(&request, &observations)?;
        let json = manager
            .agent_step(
                prompt,
                request.reasoning_effort.as_str(),
                asset_paths.clone(),
            )
            .await
            .inspect_err(|_| cleanup_assets(storage, &request.assets))?;
        if state.is_cancelled(&request.run_id)? {
            return finish_cancelled(storage, state, &request, &mut events);
        }
        let model_step = parse_step(
            &json,
            request.mode == super::protocol::InteractionMode::Auto,
        )?;
        events.emit(AgentEvent::DecisionSummary {
            text: model_step.decision_summary,
        });
        if model_step.action == ModelAction::Final {
            let message = model_step.message.unwrap_or_default();
            events.emit(AgentEvent::Message {
                text: message.clone(),
            });
            events.emit(AgentEvent::RunCompleted {
                status: RunStatus::Completed,
            });
            cleanup_assets(storage, &request.assets);
            state.finish_run(&request.run_id)?;
            return Ok(AgentRunResult {
                run_id: request.run_id,
                status: RunStatus::Completed,
                message,
                approval: None,
            });
        }
        let call = model_step
            .tool_call
            .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "Agent 未返回工具调用"))?;
        let call_id = Uuid::new_v4().to_string();
        events.emit(AgentEvent::ToolStarted {
            call_id: call_id.clone(),
            name: call.name.clone(),
            summary: summarize_call(&call),
        });
        match tools::execute(storage, &call_id, call.clone()) {
            Ok(ToolOutcome::Observation(result)) => {
                events.emit(AgentEvent::ToolCompleted {
                    call_id,
                    name: call.name.clone(),
                    summary: summarize_result(&result),
                });
                observations.push(format!("{} => {}", call.name, result));
            }
            Ok(ToolOutcome::Approval { view, action }) => {
                events.emit(AgentEvent::ApprovalRequired {
                    approval: view.clone(),
                });
                state.insert(PendingApproval {
                    run_id: request.run_id.clone(),
                    view: view.clone(),
                    action: *action,
                    assets: request.assets,
                })?;
                state.finish_run(&request.run_id)?;
                return Ok(AgentRunResult {
                    run_id: request.run_id,
                    status: RunStatus::WaitingApproval,
                    message: "等待用户批准写操作".into(),
                    approval: Some(view),
                });
            }
            Err(error) => {
                events.emit(AgentEvent::ToolCompleted {
                    call_id,
                    name: call.name.clone(),
                    summary: format!("{}：{}", error.code, error.message),
                });
                observations.push(format!(
                    "{} => ERROR {}: {}",
                    call.name, error.code, error.message
                ));
            }
        }
    }
    cleanup_assets(storage, &request.assets);
    events.emit(AgentEvent::RunCompleted {
        status: RunStatus::LimitReached,
    });
    state.finish_run(&request.run_id)?;
    Ok(AgentRunResult {
        run_id: request.run_id,
        status: RunStatus::LimitReached,
        message: "Agent 已达到本轮步骤上限，请缩小任务或继续下一轮。".into(),
        approval: None,
    })
}

fn validate_request(request: &StartTurnRequest) -> Result<(), AppError> {
    if request.message.trim().is_empty() {
        return Err(AppError::validation("消息不能为空"));
    }
    if request.message.len() > 20_000 {
        return Err(AppError::validation("消息不能超过 20000 字符"));
    }
    if request.history.len() > 50 {
        return Err(AppError::validation("会话历史过长"));
    }
    if request.references.len() > 8 {
        return Err(AppError::validation("引用卡片不能超过 8 张"));
    }
    Ok(())
}

fn finish_cancelled<F: FnMut(AgentEventPayload)>(
    storage: &Storage,
    state: &AgentRuntimeState,
    request: &StartTurnRequest,
    events: &mut EventEmitter<F>,
) -> Result<AgentRunResult, AppError> {
    cleanup_assets(storage, &request.assets);
    events.emit(AgentEvent::RunCompleted {
        status: RunStatus::Cancelled,
    });
    state.finish_run(&request.run_id)?;
    Ok(AgentRunResult {
        run_id: request.run_id.clone(),
        status: RunStatus::Cancelled,
        message: "运行已停止。".into(),
        approval: None,
    })
}

fn summarize_call(call: &super::protocol::ModelToolCall) -> String {
    call.query
        .clone()
        .or_else(|| call.card_id.clone())
        .unwrap_or_else(|| "结构化参数".into())
}

fn summarize_result(result: &str) -> String {
    let count = result.chars().count();
    if count <= 100 {
        result.into()
    } else {
        format!("工具返回 {count} 个字符，已交给 Agent")
    }
}
