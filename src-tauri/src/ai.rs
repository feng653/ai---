#[cfg(test)]
mod live_tests;
mod process;
mod process_error;
mod proposal;
#[cfg(test)]
mod proposal_tests;

pub use proposal::AiProposal;

use crate::domain::{CardInput, ProviderStatus};
use crate::error::AppError;
use process::{discover_codex, execute, probe};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};
use tempfile::TempDir;
use uuid::Uuid;

const OUTPUT_SCHEMA: &str = include_str!("../resources/organize-card.schema.json");

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProgress {
    pub stage: &'static str,
    pub message: String,
}

pub struct CodexProvider {
    executable: Option<PathBuf>,
    status: Mutex<ProviderStatus>,
    run_lock: Mutex<()>,
}

impl CodexProvider {
    pub fn new() -> Self {
        let executable = discover_codex();
        let status = match &executable {
            Some(path) => ProviderStatus {
                state: "disconnected".into(),
                provider: "codex-cli".into(),
                executable: Some(path.to_string_lossy().into_owned()),
                message: "已检测到 Codex CLI，连接后将验证登录状态".into(),
            },
            None => ProviderStatus {
                state: "unavailable".into(),
                provider: "codex-cli".into(),
                executable: None,
                message: "未找到 Codex CLI；请先安装并运行 codex login".into(),
            },
        };
        Self {
            executable,
            status: Mutex::new(status),
            run_lock: Mutex::new(()),
        }
    }

    pub fn status(&self) -> ProviderStatus {
        self.status
            .lock()
            .map(|value| value.clone())
            .unwrap_or_else(|_| ProviderStatus {
                state: "unavailable".into(),
                provider: "codex-cli".into(),
                executable: None,
                message: "Codex 状态锁已损坏".into(),
            })
    }

    pub fn connect(&self) -> Result<ProviderStatus, AppError> {
        let executable = self.executable.as_deref().ok_or_else(|| {
            AppError::new(
                "PROVIDER_NOT_FOUND",
                "未找到 Codex CLI；请先安装并运行 codex login",
            )
        })?;
        match probe(executable) {
            Ok(version) => {
                let status = ProviderStatus {
                    state: "connected".into(),
                    provider: "codex-cli".into(),
                    executable: Some(executable.to_string_lossy().into_owned()),
                    message: format!("{version}，登录状态有效"),
                };
                *self.status_lock()? = status.clone();
                Ok(status)
            }
            Err(error) => {
                self.record_failure(&error)?;
                Err(error)
            }
        }
    }

    pub fn organize<F>(
        &self,
        input: CardInput,
        base_revision: u64,
        asset_paths: Vec<PathBuf>,
        agent_instruction: Option<String>,
        mut progress: F,
    ) -> Result<AiProposal, AppError>
    where
        F: FnMut(AiProgress),
    {
        let _run = self
            .run_lock
            .try_lock()
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "已有 Codex 整理任务正在运行"))?;
        self.connect()?;
        let executable = self
            .executable
            .as_deref()
            .ok_or_else(|| AppError::new("PROVIDER_NOT_FOUND", "未找到 Codex CLI"))?;
        progress(AiProgress {
            stage: "preparing",
            message: "正在准备只读分析材料…".into(),
        });
        let directory = tempfile::tempdir().map_err(|error| {
            AppError::new("FILE_ERROR", format!("AI 临时目录创建失败：{error}"))
        })?;
        let images = stage_images(&directory, &asset_paths)?;
        let schema_path = directory.path().join("output.schema.json");
        let output_path = directory.path().join("proposal.json");
        std::fs::write(&schema_path, OUTPUT_SCHEMA)?;
        let prompt = proposal::build_prompt(&input, images.len(), agent_instruction.as_deref())?;
        progress(AiProgress {
            stage: "analyzing",
            message: "Codex 正在分析题目与作答…".into(),
        });
        let mut turn_started = false;
        let json = execute(
            executable,
            directory.path(),
            &schema_path,
            &output_path,
            &images,
            &prompt,
            |line| {
                if !turn_started && event_type(line).as_deref() == Some("turn.started") {
                    turn_started = true;
                    progress(AiProgress {
                        stage: "analyzing",
                        message: "Codex 已开始生成结构化建议…".into(),
                    });
                }
            },
        );
        let json = match json {
            Ok(value) => value,
            Err(error) => {
                if matches!(error.code.as_str(), "AUTH_EXPIRED" | "PROVIDER_NOT_FOUND") {
                    self.record_failure(&error)?;
                }
                return Err(error);
            }
        };
        progress(AiProgress {
            stage: "validating",
            message: "正在验证 Codex 结构化结果…".into(),
        });
        proposal::parse_proposal(&json, &input, Uuid::new_v4().to_string(), base_revision)
    }

    fn status_lock(&self) -> Result<MutexGuard<'_, ProviderStatus>, AppError> {
        self.status
            .lock()
            .map_err(|_| AppError::new("PROVIDER_ERROR", "Codex 状态锁已损坏"))
    }

    fn record_failure(&self, error: &AppError) -> Result<(), AppError> {
        let state = if error.code == "PROVIDER_NOT_FOUND" {
            "unavailable"
        } else {
            "expired"
        };
        let mut status = self.status_lock()?;
        status.state = state.into();
        status.message = error.message.clone();
        Ok(())
    }
}

fn stage_images(directory: &TempDir, sources: &[PathBuf]) -> Result<Vec<PathBuf>, AppError> {
    sources
        .iter()
        .enumerate()
        .map(|(index, source)| {
            let extension = source
                .extension()
                .and_then(|value| value.to_str())
                .filter(|value| value.chars().all(|item| item.is_ascii_alphanumeric()))
                .unwrap_or("img");
            let target = directory
                .path()
                .join(format!("input-{}.{}", index + 1, extension));
            std::fs::copy(source, &target).map_err(|error| {
                AppError::new("FILE_ERROR", format!("AI 图片暂存失败：{error}"))
            })?;
            Ok(target)
        })
        .collect()
}

fn event_type(line: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(line).ok()?;
    value.get("type")?.as_str().map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_jsonl_event_types() {
        assert_eq!(
            event_type(r#"{"type":"turn.started"}"#).as_deref(),
            Some("turn.started")
        );
        assert_eq!(event_type("not-json"), None);
    }
}
