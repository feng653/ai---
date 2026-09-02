use crate::ai::{AiProgress, AiProposal, CodexProvider};
use crate::domain::{Card, CardAsset, CardFilter, CardInput, ProviderStatus};
use crate::error::AppError;
use crate::storage::Storage;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, State, Window};

#[tauri::command]
pub fn list_cards(
    storage: State<'_, Storage>,
    filter: Option<CardFilter>,
) -> Result<Vec<Card>, AppError> {
    storage.list_cards(filter.unwrap_or_default())
}

#[tauri::command]
pub fn get_card(storage: State<'_, Storage>, id: String) -> Result<Card, AppError> {
    storage.get_card(&id)
}

#[tauri::command]
pub fn save_card(
    storage: State<'_, Storage>,
    input: CardInput,
    id: Option<String>,
    expected_revision: Option<u64>,
) -> Result<Card, AppError> {
    storage.save_card(input, id, expected_revision)
}

#[tauri::command]
pub fn delete_card(storage: State<'_, Storage>, id: String) -> Result<(), AppError> {
    storage.delete_card(&id)
}

#[tauri::command]
pub fn import_asset(
    storage: State<'_, Storage>,
    file_name: String,
    mime_type: String,
    bytes: Vec<u8>,
) -> Result<CardAsset, AppError> {
    storage.import_asset(&file_name, &mime_type, &bytes)
}

#[tauri::command]
pub fn delete_asset(storage: State<'_, Storage>, id: String) -> Result<(), AppError> {
    storage.delete_asset(&id)
}

#[tauri::command]
pub fn read_asset(storage: State<'_, Storage>, id: String) -> Result<Vec<u8>, AppError> {
    storage.read_asset(&id)
}

#[tauri::command]
pub fn get_ai_provider_status(provider: State<'_, Arc<CodexProvider>>) -> ProviderStatus {
    provider.status()
}

#[tauri::command]
pub async fn connect_ai_provider(
    provider: State<'_, Arc<CodexProvider>>,
) -> Result<ProviderStatus, AppError> {
    let provider = Arc::clone(provider.inner());
    tauri::async_runtime::spawn_blocking(move || provider.connect())
        .await
        .map_err(|error| AppError::new("PROVIDER_ERROR", format!("Codex 连接任务失败：{error}")))?
}

#[tauri::command]
pub async fn organize_card(
    provider: State<'_, Arc<CodexProvider>>,
    storage: State<'_, Storage>,
    window: Window,
    input: CardInput,
    base_revision: u64,
    request_id: String,
    agent_turn: Option<AgentTurn>,
) -> Result<AiProposal, AppError> {
    let asset_paths = storage.resolve_asset_paths(&input.assets)?;
    let provider = Arc::clone(provider.inner());
    let (agent_instruction, agent_history) = agent_turn
        .map(|turn| (Some(turn.instruction), Some(turn.history)))
        .unwrap_or((None, None));
    tauri::async_runtime::spawn_blocking(move || {
        provider.organize(
            input,
            base_revision,
            asset_paths,
            agent_instruction,
            agent_history,
            |progress| {
                let _ = window.emit(
                    "ai-progress",
                    AiProgressPayload {
                        request_id: request_id.clone(),
                        progress,
                    },
                );
            },
        )
    })
    .await
    .map_err(|error| AppError::new("PROVIDER_ERROR", format!("Codex 整理任务失败：{error}")))?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTurn {
    instruction: String,
    history: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiProgressPayload {
    request_id: String,
    #[serde(flatten)]
    progress: AiProgress,
}
