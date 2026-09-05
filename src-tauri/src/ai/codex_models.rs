use super::codex::CodexProvider;
use super::codex_app_server_process::RunningServer;
use super::manager::AiManager;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexModel {
    pub model: String,
    pub display_name: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexModels {
    pub models: Vec<CodexModel>,
    pub selected: Option<String>,
}

pub(super) fn read_model(home: &Path) -> Result<Option<String>, AppError> {
    let path = home.join("selected-model.json");
    if !path.exists() {
        return Ok(None);
    }
    let model: String = serde_json::from_slice(&std::fs::read(path)?)
        .map_err(|_| AppError::new("CONFIG_ERROR", "Codex 模型设置损坏"))?;
    validate_model(&model)?;
    Ok(Some(model))
}

fn validate_model(model: &str) -> Result<(), AppError> {
    if model.is_empty()
        || model.len() > 200
        || !model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-._/:".contains(c))
    {
        return Err(AppError::validation("模型标识无效"));
    }
    Ok(())
}

fn write_model(home: &Path, model: &str) -> Result<(), AppError> {
    validate_model(model)?;
    std::fs::create_dir_all(home)?;
    let mut file = tempfile::NamedTempFile::new_in(home)?;
    file.write_all(serde_json::to_string(model).unwrap().as_bytes())?;
    file.as_file().sync_all()?;
    file.persist(home.join("selected-model.json"))
        .map_err(|error| AppError::new("CONFIG_ERROR", format!("模型保存失败：{error}")))?;
    Ok(())
}

fn parse_models(value: &Value) -> Result<Vec<CodexModel>, AppError> {
    let rows = value["data"]
        .as_array()
        .ok_or_else(|| AppError::new("PROVIDER_ERROR", "Codex 未返回模型列表"))?;
    rows.iter()
        .filter(|row| row["hidden"] != true)
        .map(|row| {
            let model: CodexModel = serde_json::from_value(row.clone())
                .map_err(|_| AppError::new("PROVIDER_ERROR", "Codex 模型格式无效"))?;
            validate_model(&model.model)?;
            Ok(model)
        })
        .collect()
}

impl CodexProvider {
    pub(super) fn selected_model(&self) -> Result<Option<String>, AppError> {
        read_model(&self.home)
    }

    fn discover_models(&self) -> Result<Vec<CodexModel>, AppError> {
        self.connect()?;
        let directory = tempfile::tempdir()?;
        let mut server = RunningServer::start(self.executable()?, &self.home, directory.path())?;
        let deadline = Instant::now() + Duration::from_secs(30);
        server.send(json!({"method":"initialize","id":1,"params":{"clientInfo":{"name":"zhishi","version":env!("CARGO_PKG_VERSION")}}}))?;
        server.wait_response(1, deadline)?;
        server.send(json!({"method":"initialized","params":{}}))?;
        let mut models = Vec::new();
        let mut cursor = Value::Null;
        for id in 2..22 {
            server.send(json!({"method":"model/list","id":id,"params":{"limit":100,"includeHidden":false,"cursor":cursor}}))?;
            let page = server.wait_response(id, deadline)?;
            models.extend(parse_models(&page)?);
            cursor = page["nextCursor"].clone();
            if cursor.is_null() {
                if models.is_empty() {
                    return Err(AppError::new("PROVIDER_ERROR", "当前订阅没有可选模型"));
                }
                return Ok(models);
            }
        }
        Err(AppError::new("PROVIDER_ERROR", "模型列表分页异常，请重试"))
    }

    pub(super) fn models(&self) -> Result<CodexModels, AppError> {
        let _guard = self
            .run_lock
            .try_lock()
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "Codex 任务运行中，请稍后刷新模型"))?;
        Ok(CodexModels {
            models: self.discover_models()?,
            selected: self.selected_model()?,
        })
    }

    pub(super) fn save_model(&self, model: &str) -> Result<(), AppError> {
        let _guard = self
            .run_lock
            .try_lock()
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "Codex 任务运行中，暂不能切换模型"))?;
        validate_model(model)?;
        if !self
            .discover_models()?
            .iter()
            .any(|item| item.model == model)
        {
            return Err(AppError::validation("所选模型当前不可用，请刷新模型列表"));
        }
        write_model(&self.home, model)
    }
}

impl AiManager {
    pub async fn codex_models(&self) -> Result<CodexModels, AppError> {
        let codex = self.codex.clone();
        tauri::async_runtime::spawn_blocking(move || codex.models())
            .await
            .map_err(|e| AppError::new("PROVIDER_ERROR", e.to_string()))?
    }
    pub async fn save_codex_model(&self, model: String) -> Result<(), AppError> {
        let codex = self.codex.clone();
        tauri::async_runtime::spawn_blocking(move || codex.save_model(&model))
            .await
            .map_err(|e| AppError::new("PROVIDER_ERROR", e.to_string()))?
    }
}

pub fn prepare_codex_home(home: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(home)?;
    let model = read_model(home)?;
    let mut config = "cli_auth_credentials_store = \"file\"\n".to_owned();
    if let Some(model) = model {
        config.push_str(&format!(
            "model = {}\n",
            serde_json::to_string(&model).unwrap()
        ));
    }
    std::fs::write(home.join("config.toml"), config)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "requires logged-in ZHISHI_LIVE_DATA_DIR; reads model catalog only"]
    fn live_model_catalog() {
        let path = std::env::var_os("ZHISHI_LIVE_DATA_DIR").expect("data directory required");
        let provider = CodexProvider::new(Path::new(&path));
        let result = provider.models().unwrap();
        assert!(!result.models.is_empty());
    }
    #[test]
    fn selection_survives_home_preparation_and_restart() {
        let home = tempfile::tempdir().unwrap();
        write_model(home.path(), "test-model").unwrap();
        super::super::process::prepare_codex_home(home.path()).unwrap();
        assert_eq!(
            read_model(home.path()).unwrap().as_deref(),
            Some("test-model")
        );
        let config = std::fs::read_to_string(home.path().join("config.toml")).unwrap();
        assert!(config.contains("model = \"test-model\""));
        write_model(home.path(), "other-model").unwrap();
        assert_eq!(
            read_model(home.path()).unwrap().as_deref(),
            Some("other-model")
        );
        assert!(write_model(home.path(), "bad\nmodel").is_err());
        assert_eq!(
            read_model(home.path()).unwrap().as_deref(),
            Some("other-model")
        );
    }
    #[test]
    fn catalog_uses_model_slug_and_excludes_hidden_models() {
        let rows = parse_models(&json!({"data":[
            {"id":"row-id","model":"available-model","displayName":"Available","isDefault":true},
            {"model":"hidden-model","displayName":"Hidden","hidden":true}
        ]}))
        .unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].model, "available-model");
        assert!(parse_models(&json!({})).is_err());
    }
}
