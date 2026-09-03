use super::approval::execute_approval;
use super::protocol::{AgentEvent, AgentEventPayload, ApprovalResult, RunStatus};
use super::runtime::{run_steps, EventEmitter};
use super::state::AgentRuntimeState;
use crate::ai::AiManager;
use crate::error::AppError;
use crate::storage::Storage;
use std::sync::Arc;

pub async fn resolve_approval<F>(
    manager: &Arc<AiManager>,
    storage: &Storage,
    state: &AgentRuntimeState,
    request_id: String,
    approval_id: &str,
    approved: bool,
    sink: F,
) -> Result<ApprovalResult, AppError>
where
    F: FnMut(AgentEventPayload),
{
    let resolution = execute_approval(storage, state, approval_id, approved)?;
    let result = resolution.result;
    let mut events = EventEmitter::new(request_id, result.run_id.clone(), sink);
    events.emit(AgentEvent::ApprovalResolved {
        approval_id: approval_id.into(),
        approved,
    });
    events.emit(AgentEvent::ToolCompleted {
        call_id: resolution.call_id,
        name: resolution.tool_name.clone(),
        summary: result.message.clone(),
    });
    events.emit(AgentEvent::Message {
        text: result.message.clone(),
    });
    let Some(mut continuation) = resolution.continuation else {
        events.emit(AgentEvent::RunCompleted {
            status: RunStatus::Completed,
        });
        state.finish_run(&result.run_id)?;
        return Ok(result);
    };
    continuation.observations.push(format!(
        "{} => {}",
        resolution.tool_name,
        serde_json::to_string(&result).map_err(|error| {
            AppError::new(
                "INVALID_TOOL_RESULT",
                format!("批准结果序列化失败：{error}"),
            )
        })?
    ));
    continuation.owns_assets = false;
    state.prepare_run(&result.run_id)?;
    if let Err(error) = run_steps(manager, storage, state, continuation, &mut events).await {
        events.emit(AgentEvent::Message {
            text: format!("写操作已完成，但继续任务失败：{}", error.message),
        });
        events.emit(AgentEvent::RunCompleted {
            status: RunStatus::Failed,
        });
        state.finish_run(&result.run_id)?;
    }
    Ok(result)
}
