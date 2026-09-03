use super::api_agent;
use super::manager::AiManager;
use super::manager_state::RunningGuard;
use super::settings::CODEX_ID;
use crate::error::AppError;
use std::path::PathBuf;

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
            return Err(agent_api_required());
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

fn agent_api_required() -> AppError {
    AppError::new(
        "AUTH_REQUIRED",
        "知拾 Agent 由项目内运行时执行，不调用 Codex CLI。请在“AI 接入”中配置并选中一个 API 服务。",
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codex_account_is_not_used_as_the_agent_runtime() {
        let error = agent_api_required();
        assert_eq!(error.code, "AUTH_REQUIRED");
        assert!(error.message.contains("不调用 Codex CLI"));
    }
}
