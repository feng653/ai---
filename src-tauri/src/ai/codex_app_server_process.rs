use super::process::prepare_codex_home;
use super::process_error::classify_error;
use crate::error::AppError;
use serde_json::Value;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::Path;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError};
use std::thread::{self, JoinHandle};
use std::time::Instant;

const MAX_MESSAGE_BYTES: usize = 1024 * 1024;
const MAX_DIAGNOSTIC_BYTES: usize = 32 * 1024;

pub(super) struct RunningServer {
    child: Child,
    stdin: Option<ChildStdin>,
    lines: Receiver<String>,
    stdout_thread: Option<JoinHandle<()>>,
    stderr_thread: Option<JoinHandle<String>>,
    #[cfg(windows)]
    _job: std::os::windows::io::OwnedHandle,
}

impl RunningServer {
    pub(super) fn start(executable: &Path, home: &Path, cwd: &Path) -> Result<Self, AppError> {
        prepare_codex_home(home)?;
        let mut command = Command::new(executable);
        command
            .args(["app-server", "--listen", "stdio://"])
            .current_dir(cwd)
            .env("CODEX_HOME", home)
            .env_remove("OPENAI_API_KEY")
            .env_remove("CODEX_API_KEY")
            .env_remove("CODEX_ACCESS_TOKEN")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x0800_0000);
        }
        let mut child = command.spawn().map_err(|error| {
            AppError::new(
                "PROVIDER_NOT_FOUND",
                format!("无法启动 Codex App Server：{error}"),
            )
        })?;
        #[cfg(windows)]
        let job = super::process_windows::assign_kill_on_close(&child).inspect_err(|_| {
            let _ = child.kill();
            let _ = child.wait();
        })?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| AppError::new("PROVIDER_START_FAILED", "无法写入 Codex App Server"))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AppError::new("PROVIDER_START_FAILED", "无法读取 Codex App Server"))?;
        let stderr = child.stderr.take().ok_or_else(|| {
            AppError::new(
                "PROVIDER_START_FAILED",
                "无法读取 Codex App Server 错误输出",
            )
        })?;
        let (sender, lines) = mpsc::channel();
        let stdout_thread = thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if sender.send(line).is_err() {
                    break;
                }
            }
        });
        let stderr_thread = thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = BufReader::new(stderr)
                .take(MAX_DIAGNOSTIC_BYTES as u64)
                .read_to_end(&mut bytes);
            String::from_utf8_lossy(&bytes).into_owned()
        });
        Ok(Self {
            child,
            stdin: Some(stdin),
            lines,
            stdout_thread: Some(stdout_thread),
            stderr_thread: Some(stderr_thread),
            #[cfg(windows)]
            _job: job,
        })
    }

    pub(super) fn send(&mut self, value: Value) -> Result<(), AppError> {
        let pipe = self
            .stdin
            .as_mut()
            .ok_or_else(|| AppError::new("PROVIDER_ERROR", "Codex App Server 已停止"))?;
        serde_json::to_writer(&mut *pipe, &value).map_err(|error| {
            AppError::new(
                "PROVIDER_ERROR",
                format!("App Server 请求序列化失败：{error}"),
            )
        })?;
        pipe.write_all(b"\n")
            .and_then(|_| pipe.flush())
            .map_err(|error| {
                AppError::new(
                    "PROVIDER_ERROR",
                    format!("App Server 请求发送失败：{error}"),
                )
            })
    }

    fn next(&mut self, deadline: Instant) -> Result<Value, AppError> {
        let wait = deadline.saturating_duration_since(Instant::now());
        let line = match self.lines.recv_timeout(wait) {
            Ok(line) => line,
            Err(RecvTimeoutError::Timeout) => {
                return Err(AppError::new(
                    "PROVIDER_TIMEOUT",
                    "Codex Agent 请求超过 180 秒",
                ))
            }
            Err(RecvTimeoutError::Disconnected) => {
                let stderr = self.stop();
                return Err(AppError::new(
                    "PROVIDER_ERROR",
                    format!("Codex App Server 意外退出：{}", stderr.trim()),
                ));
            }
        };
        if line.len() > MAX_MESSAGE_BYTES {
            return Err(AppError::new(
                "INVALID_AI_OUTPUT",
                "Codex App Server 消息超过 1 MiB 限制",
            ));
        }
        serde_json::from_str(&line).map_err(|error| {
            AppError::new(
                "PROVIDER_ERROR",
                format!("App Server 返回无效 JSON：{error}"),
            )
        })
    }

    pub(super) fn wait_response(&mut self, id: u64, deadline: Instant) -> Result<Value, AppError> {
        loop {
            let message = self.next(deadline)?;
            if message["id"].as_u64() == Some(id) {
                return response_result(&message);
            }
        }
    }

    pub(super) fn wait_turn(&mut self, id: u64, deadline: Instant) -> Result<String, AppError> {
        let mut answer = None;
        loop {
            let message = self.next(deadline)?;
            if message["id"].as_u64() == Some(id) {
                response_result(&message)?;
            }
            if let Some(text) = extract_agent_text(&message) {
                answer = Some(text);
            }
            if message["method"] != "turn/completed" {
                continue;
            }
            if let Some(items) = message["params"]["turn"]["items"].as_array() {
                answer = items
                    .iter()
                    .filter_map(extract_agent_text)
                    .next_back()
                    .or(answer);
            }
            let turn = &message["params"]["turn"];
            if turn["status"] != "completed" {
                let detail = turn["error"]["message"]
                    .as_str()
                    .unwrap_or("Codex Agent 运行失败");
                return Err(AppError::new(classify_error(detail), detail));
            }
            return answer
                .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "Codex Agent 未返回结构化结果"));
        }
    }

    fn stop(&mut self) -> String {
        self.stdin.take();
        let _ = self.child.kill();
        let _ = self.child.wait();
        if let Some(thread) = self.stdout_thread.take() {
            let _ = thread.join();
        }
        self.stderr_thread
            .take()
            .and_then(|thread| thread.join().ok())
            .unwrap_or_default()
    }
}

impl Drop for RunningServer {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

pub(super) fn extract_agent_text(message: &Value) -> Option<String> {
    let item = if message["method"] == "item/completed" {
        &message["params"]["item"]
    } else {
        message
    };
    if item["type"] != "agentMessage" {
        return None;
    }
    item["text"]
        .as_str()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(str::to_owned)
}

fn response_result(message: &Value) -> Result<Value, AppError> {
    if let Some(error) = message.get("error") {
        let detail = error["message"]
            .as_str()
            .unwrap_or("Codex App Server 请求失败");
        return Err(AppError::new(classify_error(detail), detail));
    }
    Ok(message.get("result").cloned().unwrap_or(Value::Null))
}
