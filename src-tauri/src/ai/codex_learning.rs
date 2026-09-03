use super::codex::CodexProvider;
use super::knowledge::{self, GeneratedKnowledgeCard, KnowledgeCardRequest};
use super::process::{execute, ExecutionPaths};
use super::AiProgress;
use crate::error::AppError;

impl CodexProvider {
    pub fn generate_knowledge_card<F>(
        &self,
        request: KnowledgeCardRequest,
        mut progress: F,
    ) -> Result<GeneratedKnowledgeCard, AppError>
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
            message: "正在冻结当前知识点和来源错题…".into(),
        });
        let directory = tempfile::tempdir().map_err(|error| {
            AppError::new("FILE_ERROR", format!("AI 临时目录创建失败：{error}"))
        })?;
        let schema_path = directory.path().join("knowledge-card.schema.json");
        let output_path = directory.path().join("knowledge-card.json");
        std::fs::write(&schema_path, knowledge::KNOWLEDGE_SCHEMA)?;
        let prompt = knowledge::build_prompt(&request)?;
        progress(AiProgress {
            stage: "analyzing",
            message: "Codex 正在提炼核心方法与个人易错提醒…".into(),
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
            message: "正在检查内容边界和精炼程度…".into(),
        });
        knowledge::parse_output(&json, &request)
    }
}
