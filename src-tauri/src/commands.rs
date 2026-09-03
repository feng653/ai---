use crate::ai::{
    AgentRequest, AiManager, AiProgress, AiProposal, ApiProviderInput, GeneratedKnowledgeCard,
    KnowledgeCardRequest, ProviderSummary,
};
use crate::domain::{Card, CardAsset, CardFilter, CardInput, PracticeCardDraft, ProviderStatus};
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
    force_draft: Option<bool>,
) -> Result<Card, AppError> {
    storage.save_card(input, id, expected_revision, force_draft.unwrap_or(false))
}

#[tauri::command]
pub fn save_practice_cards(
    storage: State<'_, Storage>,
    drafts: Vec<PracticeCardDraft>,
) -> Result<Vec<Card>, AppError> {
    storage.save_practice_cards(drafts)
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
pub fn get_ai_provider_status(manager: State<'_, Arc<AiManager>>) -> ProviderStatus {
    manager.status()
}

#[tauri::command]
pub async fn connect_ai_provider(
    manager: State<'_, Arc<AiManager>>,
) -> Result<ProviderStatus, AppError> {
    manager.connect().await
}

#[tauri::command]
pub fn list_ai_providers(
    manager: State<'_, Arc<AiManager>>,
) -> Result<Vec<ProviderSummary>, AppError> {
    manager.providers()
}

#[tauri::command]
pub fn select_ai_provider(
    manager: State<'_, Arc<AiManager>>,
    id: String,
) -> Result<ProviderStatus, AppError> {
    manager.select(&id)
}

#[tauri::command]
pub async fn save_api_provider(
    manager: State<'_, Arc<AiManager>>,
    input: ApiProviderInput,
) -> Result<ProviderStatus, AppError> {
    let manager = Arc::clone(manager.inner());
    tauri::async_runtime::spawn_blocking(move || manager.save_api(&input))
        .await
        .map_err(|error| {
            AppError::new("PROVIDER_ERROR", format!("API 配置保存任务失败：{error}"))
        })?
}

#[tauri::command]
pub async fn test_api_provider(
    manager: State<'_, Arc<AiManager>>,
    input: ApiProviderInput,
) -> Result<(), AppError> {
    manager.test_api(input).await
}

#[tauri::command]
pub async fn login_codex_provider(
    manager: State<'_, Arc<AiManager>>,
) -> Result<ProviderStatus, AppError> {
    manager.login_codex().await
}

#[tauri::command]
pub async fn disconnect_ai_provider(
    manager: State<'_, Arc<AiManager>>,
    id: String,
) -> Result<(), AppError> {
    manager.disconnect(&id).await
}

#[tauri::command]
pub async fn organize_card(
    manager: State<'_, Arc<AiManager>>,
    storage: State<'_, Storage>,
    window: Window,
    input: CardInput,
    base_revision: u64,
    request_id: String,
    agent_turn: Option<AgentTurn>,
) -> Result<AiProposal, AppError> {
    let asset_paths = storage.resolve_asset_paths(&input.assets)?;
    let agent = agent_turn.map(|turn| AgentRequest {
        instruction: turn.instruction,
        history: turn.history,
        target_provided: turn.target_provided,
        web_search: turn.web_search,
    });
    manager
        .organize(input, base_revision, asset_paths, agent, move |progress| {
            let _ = window.emit(
                "ai-progress",
                AiProgressPayload {
                    request_id: request_id.clone(),
                    progress,
                },
            );
        })
        .await
}

#[tauri::command]
pub async fn generate_knowledge_card(
    manager: State<'_, Arc<AiManager>>,
    window: Window,
    request: KnowledgeCardRequest,
    request_id: String,
) -> Result<GeneratedKnowledgeCard, AppError> {
    manager
        .generate_knowledge_card(request, move |progress| {
            let _ = window.emit(
                "ai-progress",
                AiProgressPayload {
                    request_id: request_id.clone(),
                    progress,
                },
            );
        })
        .await
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTurn {
    instruction: String,
    history: Vec<String>,
    target_provided: bool,
    #[serde(default)]
    web_search: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AiProgressPayload {
    request_id: String,
    #[serde(flatten)]
    progress: AiProgress,
}
