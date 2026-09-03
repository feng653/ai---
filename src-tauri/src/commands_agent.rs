use crate::agent::{
    self, AgentEventPayload, AgentRunResult, AgentRuntimeState, ApprovalResult,
    ResolveApprovalRequest, StartTurnRequest, ToolManifestView,
};
use crate::ai::AiManager;
use crate::error::AppError;
use crate::storage::Storage;
use std::sync::Arc;
use tauri::{Emitter, State, Window};

#[tauri::command]
pub async fn agent_start_turn(
    manager: State<'_, Arc<AiManager>>,
    storage: State<'_, Storage>,
    runtime: State<'_, AgentRuntimeState>,
    window: Window,
    request_id: String,
    request: StartTurnRequest,
) -> Result<AgentRunResult, AppError> {
    let run_id = request.run_id.clone();
    let request_assets = request.assets.clone();
    let result = agent::run_turn(
        manager.inner(),
        storage.inner(),
        runtime.inner(),
        request_id,
        request,
        move |payload: AgentEventPayload| {
            let _ = window.emit("agent-event", payload);
        },
    )
    .await;
    if result.is_err() {
        let _ = runtime.finish_run(&run_id);
        for asset in request_assets {
            let _ = storage.delete_asset(&asset.id);
        }
    }
    result
}

#[tauri::command]
pub fn agent_cancel_run(
    runtime: State<'_, AgentRuntimeState>,
    run_id: String,
) -> Result<(), AppError> {
    runtime.cancel(&run_id)
}

#[tauri::command]
pub fn agent_resolve_approval(
    storage: State<'_, Storage>,
    runtime: State<'_, AgentRuntimeState>,
    request: ResolveApprovalRequest,
) -> Result<ApprovalResult, AppError> {
    agent::resolve_approval(
        storage.inner(),
        runtime.inner(),
        &request.approval_id,
        request.approved,
    )
}

#[tauri::command]
pub fn agent_list_tools() -> Vec<ToolManifestView> {
    agent::tool_manifests()
}
