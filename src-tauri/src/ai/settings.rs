use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

pub const CODEX_ID: &str = "codex";
pub const DEEPSEEK_ID: &str = "deepseek";
const LEGACY_CUSTOM_ID: &str = "compatible";
const CUSTOM_PREFIX: &str = "custom:";
const SECRET_SERVICE: &str = "com.zhishi.desktop.ai";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiProviderConfig {
    pub name: String,
    pub base_url: String,
    pub model: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiProviderInput {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub model: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AiSettings {
    active_provider: String,
    api_providers: HashMap<String, ApiProviderConfig>,
}

impl Default for AiSettings {
    fn default() -> Self {
        Self {
            active_provider: CODEX_ID.into(),
            api_providers: HashMap::new(),
        }
    }
}

pub struct SettingsStore {
    path: PathBuf,
    values: Mutex<AiSettings>,
}

impl SettingsStore {
    pub fn open(data_dir: &Path) -> Result<Self, AppError> {
        let directory = data_dir.join("ai");
        fs::create_dir_all(&directory)?;
        let path = directory.join("providers.json");
        let values = if path.exists() {
            let bytes = fs::read(&path)?;
            serde_json::from_slice(&bytes).map_err(|error| {
                AppError::new("CONFIG_ERROR", format!("AI 配置读取失败：{error}"))
            })?
        } else {
            AiSettings::default()
        };
        Ok(Self {
            path,
            values: Mutex::new(values),
        })
    }

    pub fn active(&self) -> Result<String, AppError> {
        Ok(self.lock()?.active_provider.clone())
    }

    pub fn select(&self, id: &str) -> Result<(), AppError> {
        validate_id(id)?;
        let mut values = self.lock()?;
        values.active_provider = id.into();
        self.persist(&values)
    }

    pub fn config(&self, id: &str) -> Result<Option<ApiProviderConfig>, AppError> {
        let mut config = self.lock()?.api_providers.get(id).cloned();
        if id == LEGACY_CUSTOM_ID {
            if let Some(value) = config
                .as_mut()
                .filter(|value| value.name == "OpenAI 兼容 API")
            {
                value.name = "自定义 API".into();
            }
        }
        Ok(config)
    }

    pub fn custom_configs(&self) -> Result<Vec<(String, ApiProviderConfig)>, AppError> {
        let values = self.lock()?;
        let mut configs = values
            .api_providers
            .iter()
            .filter(|(id, _)| is_custom_id(id))
            .map(|(id, config)| (id.clone(), config.clone()))
            .collect::<Vec<_>>();
        configs.sort_by(|left, right| left.1.name.cmp(&right.1.name).then(left.0.cmp(&right.0)));
        Ok(configs)
    }

    pub fn save_api(&self, input: &ApiProviderInput) -> Result<ApiProviderConfig, AppError> {
        validate_api_input(input)?;
        if !input.api_key.trim().is_empty() {
            secret_entry(&input.id)?
                .set_password(input.api_key.trim())
                .map_err(secret_error)?;
        }
        let config = ApiProviderConfig {
            name: input.name.trim().into(),
            base_url: normalize_base_url(&input.base_url),
            model: input.model.trim().into(),
        };
        let mut values = self.lock()?;
        values
            .api_providers
            .insert(input.id.clone(), config.clone());
        values.active_provider = input.id.clone();
        self.persist(&values)?;
        Ok(config)
    }

    pub fn api_key(&self, id: &str) -> Result<String, AppError> {
        secret_entry(id)?.get_password().map_err(|error| {
            if matches!(error, keyring::Error::NoEntry) {
                AppError::new("AUTH_REQUIRED", "请先填写并保存 API Key")
            } else {
                secret_error(error)
            }
        })
    }

    pub fn has_api_key(&self, id: &str) -> bool {
        secret_entry(id)
            .and_then(|entry| entry.get_password().map_err(secret_error))
            .is_ok()
    }

    pub fn remove_api(&self, id: &str) -> Result<(), AppError> {
        validate_id(id)?;
        if let Ok(entry) = secret_entry(id) {
            match entry.delete_credential() {
                Ok(()) | Err(keyring::Error::NoEntry) => {}
                Err(error) => return Err(secret_error(error)),
            }
        }
        let mut values = self.lock()?;
        values.api_providers.remove(id);
        if values.active_provider == id {
            values.active_provider = CODEX_ID.into();
        }
        self.persist(&values)
    }

    fn lock(&self) -> Result<MutexGuard<'_, AiSettings>, AppError> {
        self.values
            .lock()
            .map_err(|_| AppError::new("CONFIG_ERROR", "AI 配置锁已损坏"))
    }

    fn persist(&self, values: &AiSettings) -> Result<(), AppError> {
        let bytes = serde_json::to_vec_pretty(values).map_err(|error| {
            AppError::new("CONFIG_ERROR", format!("AI 配置序列化失败：{error}"))
        })?;
        let directory = self
            .path
            .parent()
            .ok_or_else(|| AppError::new("CONFIG_ERROR", "AI 配置目录无效"))?;
        let mut temporary = tempfile::NamedTempFile::new_in(directory)?;
        temporary.write_all(&bytes)?;
        temporary.as_file().sync_all()?;
        temporary
            .persist(&self.path)
            .map_err(|error| AppError::from(error.error))?;
        Ok(())
    }
}

pub fn validate_api_input(input: &ApiProviderInput) -> Result<(), AppError> {
    if input.id != DEEPSEEK_ID && !is_custom_id(&input.id) {
        return Err(AppError::validation("不支持的 API 服务商"));
    }
    if input.name.trim().is_empty() || input.model.trim().is_empty() {
        return Err(AppError::validation("服务名称和模型名称不能为空"));
    }
    let url = reqwest::Url::parse(input.base_url.trim())
        .map_err(|_| AppError::validation("Base URL 格式无效"))?;
    let local_http =
        url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1"));
    if url.scheme() != "https" && !local_http {
        return Err(AppError::validation(
            "Base URL 必须使用 HTTPS；本机服务可使用 HTTP",
        ));
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err(AppError::validation("Base URL 不能包含查询参数或片段"));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(AppError::validation("Base URL 不能包含用户名或密码"));
    }
    Ok(())
}

fn validate_id(id: &str) -> Result<(), AppError> {
    if matches!(id, CODEX_ID | DEEPSEEK_ID) || is_custom_id(id) {
        Ok(())
    } else {
        Err(AppError::validation("未知的 AI 服务商"))
    }
}

fn is_custom_id(id: &str) -> bool {
    if id == LEGACY_CUSTOM_ID {
        return true;
    }
    id.strip_prefix(CUSTOM_PREFIX)
        .is_some_and(|value| uuid::Uuid::parse_str(value).is_ok())
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_owned()
}

fn secret_entry(id: &str) -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(SECRET_SERVICE, id).map_err(secret_error)
}

fn secret_error(error: keyring::Error) -> AppError {
    AppError::new("CREDENTIAL_ERROR", format!("系统凭据存储操作失败：{error}"))
}

#[cfg(test)]
#[path = "settings_tests.rs"]
mod tests;
