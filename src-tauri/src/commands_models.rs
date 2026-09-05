use crate::ai::{AiManager, CodexModels};
use crate::error::AppError;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn list_codex_models(
    manager: State<'_, Arc<AiManager>>,
) -> Result<CodexModels, AppError> {
    manager.codex_models().await
}

#[tauri::command]
pub async fn save_codex_model(
    manager: State<'_, Arc<AiManager>>,
    model: String,
) -> Result<(), AppError> {
    manager.save_codex_model(model).await
}
