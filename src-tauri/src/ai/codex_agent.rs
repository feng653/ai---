use super::codex::CodexProvider;
use super::process::{execute, ExecutionPaths};
use crate::error::AppError;
use std::path::PathBuf;
use tempfile::TempDir;

const AGENT_STEP_SCHEMA: &str = include_str!("../../resources/agent-step.schema.json");

impl CodexProvider {
    pub fn agent_step(
        &self,
        prompt: String,
        asset_paths: Vec<PathBuf>,
    ) -> Result<String, AppError> {
        let _run = self
            .run_lock
            .try_lock()
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "已有 Codex Agent 任务正在运行"))?;
        self.connect()?;
        let executable = self.executable()?;
        let directory = tempfile::tempdir().map_err(|error| {
            AppError::new("FILE_ERROR", format!("Agent 临时目录创建失败：{error}"))
        })?;
        let images = stage_images(&directory, &asset_paths)?;
        let schema_path = directory.path().join("agent-step.schema.json");
        let output_path = directory.path().join("agent-step.json");
        std::fs::write(&schema_path, AGENT_STEP_SCHEMA)?;
        execute(
            executable,
            ExecutionPaths {
                work_dir: directory.path(),
                schema: &schema_path,
                output: &output_path,
                codex_home: &self.home,
            },
            &images,
            &prompt,
            false,
            |_| {},
        )
        .inspect_err(|error| {
            let _ = self.record_failure(error);
        })
    }
}

pub(super) fn stage_images(
    directory: &TempDir,
    sources: &[PathBuf],
) -> Result<Vec<PathBuf>, AppError> {
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
