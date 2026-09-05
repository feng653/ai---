use super::codex::CodexProvider;
use super::practice::{self, PracticeGenerationRequest};
use super::practice_parse;
use super::process::{execute, ExecutionPaths};
use super::AiProgress;
use crate::domain::PracticeCardDraft;
use crate::error::AppError;

impl CodexProvider {
    pub fn generate_practice_cards<F>(
        &self,
        request: PracticeGenerationRequest,
        mut progress: F,
    ) -> Result<Vec<PracticeCardDraft>, AppError>
    where
        F: FnMut(AiProgress),
    {
        let _run = self
            .run_lock
            .try_lock()
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "已有 Codex 任务正在运行"))?;
        self.connect()?;
        let executable = self.executable()?;
        progress(AiProgress {
            stage: "preparing",
            message: "正在冻结来源错题、错误点和难度要求…".into(),
        });
        let directory = tempfile::tempdir().map_err(|error| {
            AppError::new("FILE_ERROR", format!("AI 临时目录创建失败：{error}"))
        })?;
        let schema_path = directory.path().join("practice-cards.schema.json");
        let output_path = directory.path().join("practice-cards.json");
        std::fs::write(&schema_path, practice::PRACTICE_SCHEMA)?;
        let prompt = practice::build_prompt(&request)?;
        progress(AiProgress {
            stage: "analyzing",
            message: "Codex 正在生成复习卡…".into(),
        });
        let json = execute(
            executable,
            ExecutionPaths {
                work_dir: directory.path(),
                schema: &schema_path,
                output: &output_path,
                codex_home: &self.home,
            },
            &[],
            &prompt,
            false,
            |_| {},
        )
        .inspect_err(|error| {
            let _ = self.record_failure(error);
        })?;
        progress(AiProgress {
            stage: "validating",
            message: "正在核对题目数量、知识点和来源版本…".into(),
        });
        practice_parse::parse_output(&json, &request)
    }
}
