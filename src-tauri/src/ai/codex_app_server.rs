use super::codex::CodexProvider;
use super::codex_app_server_process::RunningServer;
use super::codex_assets::stage_images;
use crate::error::AppError;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

const AGENT_STEP_SCHEMA: &str = include_str!("../../resources/agent-step.schema.json");
const RUN_TIMEOUT: Duration = Duration::from_secs(180);

impl CodexProvider {
    pub fn agent_step(
        &self,
        prompt: String,
        reasoning_effort: &str,
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
        let mut server = RunningServer::start(executable, &self.home, directory.path())?;
        run_step(
            &mut server,
            directory.path(),
            &images,
            &prompt,
            reasoning_effort,
        )
        .inspect_err(|error| {
            let _ = self.record_failure(error);
        })
    }
}

fn run_step(
    server: &mut RunningServer,
    work_dir: &Path,
    images: &[PathBuf],
    prompt: &str,
    effort: &str,
) -> Result<String, AppError> {
    let deadline = Instant::now() + RUN_TIMEOUT;
    server.send(json!({"method":"initialize","id":1,"params":{"clientInfo":{
        "name":"zhishi","title":"知拾","version":env!("CARGO_PKG_VERSION")}}}))?;
    server.wait_response(1, deadline)?;
    server.send(json!({"method":"initialized","params":{}}))?;
    server.send(thread_start_request(work_dir))?;
    let thread = server.wait_response(2, deadline)?;
    let thread_id = thread["thread"]["id"]
        .as_str()
        .ok_or_else(|| AppError::new("PROVIDER_ERROR", "Codex App Server 未返回会话 ID"))?;
    server.send(turn_start_request(
        thread_id, work_dir, images, prompt, effort,
    )?)?;
    server.wait_turn(3, deadline)
}

pub(super) fn thread_start_request(work_dir: &Path) -> Value {
    json!({"method":"thread/start","id":2,"params":{
        "cwd": work_dir.to_string_lossy(),
        "approvalPolicy":"never",
        "sandbox":"read-only",
        "ephemeral":true,
        "serviceName":"zhishi",
        "developerInstructions":"只充当知拾的结构化决策模型。不要运行命令、读写文件或调用内置工具；只根据用户输入返回符合输出 Schema 的最终 JSON。"
    }})
}

pub(super) fn turn_start_request(
    thread_id: &str,
    work_dir: &Path,
    images: &[PathBuf],
    prompt: &str,
    effort: &str,
) -> Result<Value, AppError> {
    let schema: Value = serde_json::from_str(AGENT_STEP_SCHEMA)
        .map_err(|error| AppError::new("CONFIG_ERROR", format!("Agent Schema 无效：{error}")))?;
    let mut input = vec![json!({"type":"text","text":prompt})];
    input.extend(
        images
            .iter()
            .map(|path| json!({"type":"localImage","path":path.to_string_lossy(),"detail":"auto"})),
    );
    Ok(json!({"method":"turn/start","id":3,"params":{
        "threadId":thread_id,
        "input":input,
        "cwd":work_dir.to_string_lossy(),
        "approvalPolicy":"never",
        "sandboxPolicy":{"type":"readOnly","networkAccess":false},
        "effort":effort,
        "summary":"none",
        "outputSchema":schema
    }}))
}
