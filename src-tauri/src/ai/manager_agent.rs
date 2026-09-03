use super::api_agent;
use super::manager::AiManager;
use super::manager_state::RunningGuard;
use super::settings::CODEX_ID;
use crate::error::AppError;
use std::path::PathBuf;
use std::sync::Arc;

impl AiManager {
    pub async fn agent_step(
        &self,
        prompt: String,
        reasoning_effort: &str,
        asset_paths: Vec<PathBuf>,
    ) -> Result<String, AppError> {
        let _guard = RunningGuard::acquire(&self.running)?;
        let active = self.settings.active()?;
        if active == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            return tauri::async_runtime::spawn_blocking(move || {
                codex.agent_step(prompt, asset_paths)
            })
            .await
            .map_err(|error| {
                AppError::new("PROVIDER_ERROR", format!("Codex Agent 任务失败：{error}"))
            })?;
        }
        let config = self
            .settings
            .config(&active)?
            .ok_or_else(|| AppError::new("AUTH_REQUIRED", "当前 AI 服务尚未配置"))?;
        let key = self.settings.api_key(&active)?;
        api_agent::agent_step(
            &self.client,
            &config,
            &key,
            &prompt,
            reasoning_effort,
            &asset_paths,
        )
        .await
    }
}
