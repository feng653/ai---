use super::api_learning;
use super::knowledge::{self, KnowledgeCardRequest};
use super::manager::AiManager;
use super::manager_state::RunningGuard;
use super::practice::{self, PracticeGenerationRequest};
use super::practice_parse;
use super::settings::CODEX_ID;
use super::AiProgress;
use crate::domain::{GeneratedKnowledgeCard, PracticeCardDraft};
use crate::error::AppError;
use std::sync::Arc;

impl AiManager {
    pub async fn generate_knowledge_card<F>(
        &self,
        request: KnowledgeCardRequest,
        mut progress: F,
    ) -> Result<GeneratedKnowledgeCard, AppError>
    where
        F: FnMut(AiProgress) + Send + 'static,
    {
        let _guard = RunningGuard::acquire(&self.running)?;
        let active = self.settings.active()?;
        if active == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            return tauri::async_runtime::spawn_blocking(move || {
                codex.generate_knowledge_card(request, progress)
            })
            .await
            .map_err(|error| {
                AppError::new("PROVIDER_ERROR", format!("Codex 生成任务失败：{error}"))
            })?;
        }
        let config = self
            .settings
            .config(&active)?
            .ok_or_else(|| AppError::new("AUTH_REQUIRED", "当前 AI 服务尚未配置"))?;
        let key = self.settings.api_key(&active)?;
        let prompt = knowledge::build_prompt(&request)?;
        progress(AiProgress {
            stage: "preparing",
            message: "正在冻结当前知识点和来源错题…".into(),
        });
        progress(AiProgress {
            stage: "analyzing",
            message: format!("{} 正在提炼知识卡片…", config.name),
        });
        let json = api_learning::generate(&self.client, &config, &key, &prompt).await?;
        progress(AiProgress {
            stage: "validating",
            message: "正在检查内容边界和精炼程度…".into(),
        });
        knowledge::parse_output(&json, &request)
    }

    pub async fn generate_practice_cards<F>(
        &self,
        request: PracticeGenerationRequest,
        mut progress: F,
    ) -> Result<Vec<PracticeCardDraft>, AppError>
    where
        F: FnMut(AiProgress) + Send + 'static,
    {
        let _guard = RunningGuard::acquire(&self.running)?;
        let active = self.settings.active()?;
        if active == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            return tauri::async_runtime::spawn_blocking(move || {
                codex.generate_practice_cards(request, progress)
            })
            .await
            .map_err(|error| {
                AppError::new("PROVIDER_ERROR", format!("Codex 生成任务失败：{error}"))
            })?;
        }
        let config = self
            .settings
            .config(&active)?
            .ok_or_else(|| AppError::new("AUTH_REQUIRED", "当前 AI 服务尚未配置"))?;
        let key = self.settings.api_key(&active)?;
        let prompt = practice::build_prompt(&request)?;
        progress(AiProgress {
            stage: "preparing",
            message: "正在冻结来源错题、错误点和难度要求…".into(),
        });
        progress(AiProgress {
            stage: "analyzing",
            message: format!("{} 正在设计相似复习题…", config.name),
        });
        let json =
            api_learning::generate_practice(&self.client, &config, &key, &prompt, request.count)
                .await?;
        progress(AiProgress {
            stage: "validating",
            message: "正在核对题目数量、知识点和来源版本…".into(),
        });
        practice_parse::parse_output(&json, &request)
    }
}
