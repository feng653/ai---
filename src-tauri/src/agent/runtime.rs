use super::model::{build_prompt, parse_step};
use super::protocol::{
    AgentEvent, AgentEventPayload, AgentRunResult, ModelAction, RunStatus, StartTurnRequest,
};
use super::runtime_support::{
    cleanup_owned_assets, finish_cancelled, repair_referenced_card_call, summarize_call,
    summarize_result, validate_request,
};
use super::state::{AgentRuntimeState, PendingApproval, RunContinuation};
use super::tools::{self, ToolOutcome};
use crate::ai::AiManager;
use crate::error::AppError;
use crate::storage::Storage;
use std::sync::Arc;
use uuid::Uuid;

pub(super) struct EventEmitter<F> {
    request_id: String,
    run_id: String,
    sequence: u64,
    sink: F,
}

impl<F: FnMut(AgentEventPayload)> EventEmitter<F> {
    pub(super) fn new(request_id: String, run_id: String, sink: F) -> Self {
        Self {
            request_id,
            run_id,
            sequence: 0,
            sink,
        }
    }

    pub(super) fn emit(&mut self, event: AgentEvent) {
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
    let mut events = EventEmitter::new(request_id, request.run_id.clone(), sink);
    run_steps(
        manager,
        storage,
        state,
        RunContinuation {
            request,
            observations: Vec::new(),
            next_step: 0,
            owns_assets: true,
        },
        &mut events,
    )
    .await
}

pub(super) async fn run_steps<F>(
    manager: &Arc<AiManager>,
    storage: &Storage,
    state: &AgentRuntimeState,
    continuation: RunContinuation,
    events: &mut EventEmitter<F>,
) -> Result<AgentRunResult, AppError>
where
    F: FnMut(AgentEventPayload),
{
    let RunContinuation {
        request,
        mut observations,
        next_step,
        owns_assets,
    } = continuation;
    let asset_paths = storage.resolve_asset_paths(&request.assets)?;
    for step_index in next_step..request.reasoning_effort.max_steps() {
        if state.is_cancelled(&request.run_id)? {
            return finish_cancelled(storage, state, &request, owns_assets, events);
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
            .inspect_err(|_| cleanup_owned_assets(storage, &request.assets, owns_assets))?;
        if state.is_cancelled(&request.run_id)? {
            return finish_cancelled(storage, state, &request, owns_assets, events);
        }
        let mut model_step = parse_step(
            &json,
            request.mode == super::protocol::InteractionMode::Auto,
        )?;
        repair_referenced_card_call(&mut model_step, &request);
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
            cleanup_owned_assets(storage, &request.assets, owns_assets);
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
                    assets: if owns_assets {
                        request.assets.clone()
                    } else {
                        Vec::new()
                    },
                    continuation: Some(RunContinuation {
                        request: request.clone(),
                        observations,
                        next_step: step_index + 1,
                        owns_assets,
                    }),
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
    cleanup_owned_assets(storage, &request.assets, owns_assets);
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
