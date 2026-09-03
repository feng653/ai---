use super::approval::cleanup_assets;
use super::protocol::{AgentEvent, AgentEventPayload, AgentRunResult, RunStatus, StartTurnRequest};
use super::runtime::EventEmitter;
use super::state::AgentRuntimeState;
use crate::error::AppError;
use crate::storage::Storage;

pub(super) fn repair_referenced_card_call(
    step: &mut super::protocol::ModelStep,
    request: &StartTurnRequest,
) {
    let Some(call) = step.tool_call.as_mut() else {
        return;
    };
    if call.name == "cards.get" && call.card_id.is_none() && request.references.len() == 1 {
        call.card_id = request.references.first().cloned();
    }
}

pub(super) fn validate_request(request: &StartTurnRequest) -> Result<(), AppError> {
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

pub(super) fn finish_cancelled<F: FnMut(AgentEventPayload)>(
    storage: &Storage,
    state: &AgentRuntimeState,
    request: &StartTurnRequest,
    owns_assets: bool,
    events: &mut EventEmitter<F>,
) -> Result<AgentRunResult, AppError> {
    cleanup_owned_assets(storage, &request.assets, owns_assets);
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

pub(super) fn cleanup_owned_assets(
    storage: &Storage,
    assets: &[crate::domain::CardAsset],
    owns: bool,
) {
    if owns {
        cleanup_assets(storage, assets);
    }
}

pub(super) fn summarize_call(call: &super::protocol::ModelToolCall) -> String {
    call.query
        .clone()
        .or_else(|| call.card_id.clone())
        .unwrap_or_else(|| "结构化参数".into())
}

pub(super) fn summarize_result(result: &str) -> String {
    let count = result.chars().count();
    if count <= 100 {
        result.into()
    } else {
        format!("工具返回 {count} 个字符，已交给 Agent")
    }
}
