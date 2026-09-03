use super::codex_assets::stage_images;
use super::codex_auth::{login, logout};
use super::process::{execute, probe, ExecutionPaths};
use super::proposal;
use super::{AgentRequest, AiProgress, AiProposal};
use crate::domain::{CardInput, ProviderStatus};
use crate::error::AppError;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use uuid::Uuid;

const OUTPUT_SCHEMA: &str = include_str!("../../resources/organize-card.schema.json");

fn discover_codex() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("ZHISHI_CODEX_PATH").map(PathBuf::from) {
        if path.is_file() {
            return Some(path);
        }
    }
    let path = std::env::var_os("PATH")?;
    #[cfg(windows)]
    for directory in std::env::split_paths(&path) {
        for relative in [
            "node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe",
            "node_modules/@openai/codex/vendor/x86_64-pc-windows-msvc/bin/codex.exe",
        ] {
            let candidate = directory.join(relative);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    for directory in std::env::split_paths(&path) {
        #[cfg(windows)]
        let candidate = directory.join("codex.exe");
        #[cfg(not(windows))]
        let candidate = directory.join("codex");
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

pub struct CodexProvider {
    executable: Option<PathBuf>,
    pub(super) home: PathBuf,
    status: Mutex<ProviderStatus>,
    pub(super) run_lock: Mutex<()>,
}

impl CodexProvider {
    pub fn new(data_dir: &Path) -> Self {
        let executable = discover_codex();
        let home = data_dir.join("ai").join("codex-home");
        let status = match &executable {
            Some(_) if home.join("auth.json").is_file() => {
                status("disconnected", "检测到知拾专用登录信息，使用前将重新验证")
            }
            Some(_) => status("disconnected", "请通过浏览器登录 Codex"),
            None => status("unavailable", "未找到 Codex CLI，无法启动网页登录"),
        };
        Self {
            executable,
            home,
            status: Mutex::new(status),
            run_lock: Mutex::new(()),
        }
    }

    pub fn status(&self) -> ProviderStatus {
        self.status
            .lock()
            .map(|value| value.clone())
            .unwrap_or_else(|_| status("unavailable", "Codex 状态锁已损坏"))
    }

    pub fn is_configured(&self) -> bool {
        self.home.join("auth.json").is_file()
    }

    pub fn connect(&self) -> Result<ProviderStatus, AppError> {
        let executable = self.executable()?;
        match probe(executable, &self.home) {
            Ok(version) => {
                let next = status("connected", &format!("{version}，知拾专用登录有效"));
                *self.status_lock()? = next.clone();
                Ok(next)
            }
            Err(error) => {
                self.record_failure(&error)?;
                Err(error)
            }
        }
    }

    pub fn login(&self) -> Result<ProviderStatus, AppError> {
        let _run = self.run_lock.try_lock().map_err(|_| {
            AppError::new(
                "RUN_IN_PROGRESS",
                "已有 Codex 操作正在运行，请等待完成后重试",
            )
        })?;
        let executable = self.executable()?;
        login(executable, &self.home)?;
        self.connect()
    }

    pub fn disconnect(&self) -> Result<(), AppError> {
        let _run = self.run_lock.try_lock().map_err(|_| {
            AppError::new(
                "RUN_IN_PROGRESS",
                "已有 Codex 操作正在运行，请等待完成后重试",
            )
        })?;
        if let Some(executable) = self.executable.as_deref() {
            logout(executable, &self.home)?;
        } else {
            let auth = self.home.join("auth.json");
            if auth.exists() {
                std::fs::remove_file(auth)?;
            }
        }
        *self.status_lock()? = status("disconnected", "已退出知拾专用 Codex 登录");
        Ok(())
    }

    pub fn organize<F>(
        &self,
        input: CardInput,
        base_revision: u64,
        asset_paths: Vec<PathBuf>,
        agent: Option<AgentRequest>,
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
        let executable = self.executable()?;
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
        let agent_mode = agent.is_some();
        let web_search = agent.as_ref().is_some_and(|request| request.web_search);
        let prompt = if let Some(request) = agent.as_ref() {
            super::prompt::build_agent_prompt(
                &input,
                images.len(),
                &request.instruction,
                &request.history,
                request.target_provided,
                request.web_search,
            )?
        } else {
            proposal::build_prompt(&input, images.len(), None, &[])?
        };
        progress(AiProgress {
            stage: "analyzing",
            message: "Codex 正在分析题目与作答…".into(),
        });
        let json = execute(
            executable,
            ExecutionPaths {
                work_dir: directory.path(),
                schema: &schema_path,
                output: &output_path,
                codex_home: &self.home,
            },
            &images,
            &prompt,
            web_search,
            |_| {},
        )
        .inspect_err(|error| {
            let _ = self.record_failure(error);
        })?;
        progress(AiProgress {
            stage: "validating",
            message: "正在验证结构化结果…".into(),
        });
        if agent_mode {
            proposal::parse_agent_response(
                &json,
                &input,
                Uuid::new_v4().to_string(),
                base_revision,
                agent.is_some_and(|request| request.target_provided),
                web_search,
            )
        } else {
            proposal::parse_proposal(&json, &input, Uuid::new_v4().to_string(), base_revision)
        }
    }

    pub(super) fn executable(&self) -> Result<&Path, AppError> {
        self.executable.as_deref().ok_or_else(|| {
            AppError::new("PROVIDER_NOT_FOUND", "未找到 Codex CLI，无法启动网页登录")
        })
    }

    fn status_lock(&self) -> Result<MutexGuard<'_, ProviderStatus>, AppError> {
        self.status
            .lock()
            .map_err(|_| AppError::new("PROVIDER_ERROR", "Codex 状态锁已损坏"))
    }

    pub(super) fn record_failure(&self, error: &AppError) -> Result<(), AppError> {
        let state = if error.code == "PROVIDER_NOT_FOUND" {
            "unavailable"
        } else {
            "expired"
        };
        *self.status_lock()? = status(state, &error.message);
        Ok(())
    }
}

fn status(state: &str, message: &str) -> ProviderStatus {
    ProviderStatus {
        state: state.into(),
        provider: "codex".into(),
        executable: None,
        message: message.into(),
    }
}
