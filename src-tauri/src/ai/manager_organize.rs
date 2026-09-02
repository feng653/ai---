use super::api_client;
use super::manager::AiManager;
use super::manager_state::RunningGuard;
use super::settings::{CODEX_ID, DEEPSEEK_ID};
use super::{AgentRequest, AiProgress, AiProposal};
use crate::domain::CardInput;
use crate::error::AppError;
use std::path::PathBuf;
use std::sync::Arc;

impl AiManager {
    pub async fn organize<F>(
        &self,
        input: CardInput,
        base_revision: u64,
        asset_paths: Vec<PathBuf>,
        agent: Option<AgentRequest>,
        mut progress: F,
    ) -> Result<AiProposal, AppError>
    where
        F: FnMut(AiProgress) + Send + 'static,
    {
        let _guard = RunningGuard::acquire(&self.running)?;
        let active = self.settings.active()?;
        if active == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            return tauri::async_runtime::spawn_blocking(move || {
                codex.organize(input, base_revision, asset_paths, agent, progress)
            })
            .await
            .map_err(|error| {
                AppError::new("PROVIDER_ERROR", format!("Codex 整理任务失败：{error}"))
            })?;
        }
        let config = self
            .settings
            .config(&active)?
            .ok_or_else(|| AppError::new("AUTH_REQUIRED", "当前 AI 服务尚未配置"))?;
        let key = self.settings.api_key(&active)?;
        progress(AiProgress {
            stage: "preparing",
            message: "正在准备 API 请求…".into(),
        });
        progress(AiProgress {
            stage: "analyzing",
            message: format!("{} 正在分析题目与作答…", config.name),
        });
        let result = api_client::organize(
            &self.client,
            &config,
            &key,
            api_client::OrganizeInput {
                card: input,
                base_revision,
                asset_paths,
                agent,
                official_web_search: active == DEEPSEEK_ID,
            },
        )
        .await;
        progress(AiProgress {
            stage: "validating",
            message: "正在验证结构化结果…".into(),
        });
        result
    }
}
