use super::api_client;
use super::codex::CodexProvider;
use super::manager_state::{ProviderSummary, RunningGuard};
use super::settings::{ApiProviderConfig, ApiProviderInput, SettingsStore, CODEX_ID, DEEPSEEK_ID};
use super::{AiProgress, AiProposal};
use crate::domain::{CardInput, ProviderStatus};
use crate::error::AppError;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

pub struct AiManager {
    settings: Arc<SettingsStore>,
    codex: Arc<CodexProvider>,
    client: reqwest::Client,
    running: AtomicBool,
}

impl AiManager {
    pub fn open(data_dir: &Path) -> Result<Self, AppError> {
        Ok(Self {
            settings: Arc::new(SettingsStore::open(data_dir)?),
            codex: Arc::new(CodexProvider::new(data_dir)),
            client: api_client::http_client()?,
            running: AtomicBool::new(false),
        })
    }

    pub fn status(&self) -> ProviderStatus {
        let active = self.settings.active().unwrap_or_else(|_| CODEX_ID.into());
        if active == CODEX_ID {
            return self.codex.status();
        }
        self.api_status(&active)
    }

    pub fn providers(&self) -> Result<Vec<ProviderSummary>, AppError> {
        let active = self.settings.active()?;
        let codex = self.codex.status();
        let mut values = vec![ProviderSummary {
            id: CODEX_ID.into(),
            name: "Codex".into(),
            state: codex.state,
            message: codex.message,
            active: active == CODEX_ID,
            configured: self.codex.is_configured(),
            base_url: None,
            model: None,
        }];
        values.push(self.api_summary(DEEPSEEK_ID, "DeepSeek API", &active)?);
        for (id, _) in self.settings.custom_configs()? {
            values.push(self.api_summary(&id, "自定义 API", &active)?);
        }
        Ok(values)
    }

    pub fn select(&self, id: &str) -> Result<ProviderStatus, AppError> {
        if id != CODEX_ID && (self.settings.config(id)?.is_none() || !self.settings.has_api_key(id))
        {
            return Err(AppError::new("AUTH_REQUIRED", "请先保存该服务的配置"));
        }
        self.settings.select(id)?;
        Ok(self.status())
    }

    pub fn save_api(&self, input: &ApiProviderInput) -> Result<ProviderStatus, AppError> {
        if input.api_key.trim().is_empty() && !self.settings.has_api_key(&input.id) {
            return Err(AppError::validation("首次配置必须填写 API Key"));
        }
        self.settings.save_api(input)?;
        Ok(self.api_status(&input.id))
    }

    pub async fn test_api(&self, input: ApiProviderInput) -> Result<(), AppError> {
        super::settings::validate_api_input(&input)?;
        let key = if input.api_key.trim().is_empty() {
            self.settings.api_key(&input.id)?
        } else {
            input.api_key.trim().into()
        };
        let config = ApiProviderConfig {
            name: input.name.trim().into(),
            base_url: input.base_url.trim().trim_end_matches('/').into(),
            model: input.model.trim().into(),
        };
        api_client::test_connection(&self.client, &config, &key).await
    }

    pub async fn login_codex(&self) -> Result<ProviderStatus, AppError> {
        let codex = Arc::clone(&self.codex);
        let status = tauri::async_runtime::spawn_blocking(move || codex.login())
            .await
            .map_err(|error| {
                AppError::new("PROVIDER_ERROR", format!("Codex 登录任务失败：{error}"))
            })??;
        self.settings.select(CODEX_ID)?;
        Ok(status)
    }

    pub async fn connect(&self) -> Result<ProviderStatus, AppError> {
        let active = self.settings.active()?;
        if active == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            tauri::async_runtime::spawn_blocking(move || codex.connect())
                .await
                .map_err(|error| {
                    AppError::new("PROVIDER_ERROR", format!("Codex 连接任务失败：{error}"))
                })?
        } else if self.settings.config(&active)?.is_some() && self.settings.has_api_key(&active) {
            Ok(self.api_status(&active))
        } else {
            Err(AppError::new("AUTH_REQUIRED", "当前 AI 服务尚未配置"))
        }
    }

    pub async fn disconnect(&self, id: &str) -> Result<(), AppError> {
        if id == CODEX_ID {
            let codex = Arc::clone(&self.codex);
            tauri::async_runtime::spawn_blocking(move || codex.disconnect())
                .await
                .map_err(|error| {
                    AppError::new("PROVIDER_ERROR", format!("Codex 退出任务失败：{error}"))
                })??;
        } else {
            self.settings.remove_api(id)?;
        }
        Ok(())
    }

    pub async fn organize<F>(
        &self,
        input: CardInput,
        base_revision: u64,
        asset_paths: Vec<PathBuf>,
        agent_instruction: Option<String>,
        agent_history: Option<Vec<String>>,
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
                codex.organize(
                    input,
                    base_revision,
                    asset_paths,
                    agent_instruction,
                    agent_history,
                    progress,
                )
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
                agent_instruction,
                agent_history,
            },
        )
        .await;
        progress(AiProgress {
            stage: "validating",
            message: "正在验证结构化结果…".into(),
        });
        result
    }

    fn api_status(&self, id: &str) -> ProviderStatus {
        let configured =
            self.settings.config(id).ok().flatten().is_some() && self.settings.has_api_key(id);
        ProviderStatus {
            state: if configured {
                "connected"
            } else {
                "disconnected"
            }
            .into(),
            provider: id.into(),
            executable: None,
            message: if configured {
                "API 配置已就绪"
            } else {
                "尚未配置 API Key"
            }
            .into(),
        }
    }

    fn api_summary(
        &self,
        id: &str,
        fallback_name: &str,
        active: &str,
    ) -> Result<ProviderSummary, AppError> {
        let config = self.settings.config(id)?;
        let configured = config.is_some() && self.settings.has_api_key(id);
        Ok(ProviderSummary {
            id: id.into(),
            name: config
                .as_ref()
                .map(|value| value.name.clone())
                .unwrap_or_else(|| fallback_name.into()),
            state: if configured {
                "connected"
            } else {
                "disconnected"
            }
            .into(),
            message: if configured {
                "配置已保存"
            } else {
                "尚未配置"
            }
            .into(),
            active: active == id,
            configured,
            base_url: config.as_ref().map(|value| value.base_url.clone()),
            model: config.map(|value| value.model),
        })
    }
}
