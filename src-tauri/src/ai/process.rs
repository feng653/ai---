use super::process_error::{classify_error, diagnostic};
use crate::error::AppError;
use std::ffi::OsString;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

const PROBE_TIMEOUT: Duration = Duration::from_secs(10);
const RUN_TIMEOUT: Duration = Duration::from_secs(180);
const MAX_DIAGNOSTIC_BYTES: usize = 32 * 1024;

pub fn discover_codex() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("ZHISHI_CODEX_PATH").map(PathBuf::from) {
        if path.is_file() {
            return Some(path);
        }
    }
    let path = std::env::var_os("PATH")?;
    for directory in std::env::split_paths(&path) {
        #[cfg(windows)]
        let candidate = directory.join("codex.exe");
        #[cfg(not(windows))]
        let candidate = directory.join("codex");
        if candidate.is_file() {
            return Some(candidate);
        }
    }
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
    None
}

pub fn probe(executable: &Path) -> Result<String, AppError> {
    let version = run_cli(
        executable,
        &[OsString::from("--version")],
        None,
        PROBE_TIMEOUT,
        |_| {},
    )?;
    if !version.status.success() {
        return Err(AppError::new(
            "PROVIDER_NOT_FOUND",
            diagnostic("Codex CLI 无法启动", &version.stderr, &version.stdout),
        ));
    }
    let login = run_cli(
        executable,
        &[OsString::from("login"), OsString::from("status")],
        None,
        PROBE_TIMEOUT,
        |_| {},
    )?;
    if !login.status.success() {
        return Err(AppError::new(
            "AUTH_EXPIRED",
            diagnostic("Codex 尚未登录或登录已失效", &login.stderr, &login.stdout),
        ));
    }
    Ok(version.stdout.join(" ").trim().to_owned())
}

pub fn execute<F>(
    executable: &Path,
    work_dir: &Path,
    schema_path: &Path,
    output_path: &Path,
    images: &[PathBuf],
    prompt: &str,
    mut on_event: F,
) -> Result<String, AppError>
where
    F: FnMut(&str),
{
    let mut arguments = vec![
        "exec".into(),
        "--ephemeral".into(),
        "--ignore-user-config".into(),
        "--ignore-rules".into(),
        "--sandbox".into(),
        "read-only".into(),
        "--skip-git-repo-check".into(),
        "--color".into(),
        "never".into(),
        "--json".into(),
        "-c".into(),
        "shell_environment_policy.inherit=none".into(),
        "--output-schema".into(),
        schema_path.as_os_str().into(),
        "-o".into(),
        output_path.as_os_str().into(),
        "-C".into(),
        work_dir.as_os_str().into(),
    ];
    for image in images {
        arguments.push("--image".into());
        arguments.push(image.as_os_str().into());
    }
    arguments.push("-".into());
    let capture = run_cli(executable, &arguments, Some(prompt), RUN_TIMEOUT, |line| {
        on_event(line)
    })?;
    if !capture.status.success() {
        let details = diagnostic("Codex 整理失败", &capture.stderr, &capture.stdout);
        return Err(AppError::new(classify_error(&details), details));
    }
    let metadata = std::fs::metadata(output_path)
        .map_err(|_| AppError::new("INVALID_AI_OUTPUT", "Codex 未生成结构化结果文件"))?;
    if metadata.len() > 1024 * 1024 {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            "Codex 结果超过 1 MiB 限制",
        ));
    }
    std::fs::read_to_string(output_path)
        .map_err(|error| AppError::new("INVALID_AI_OUTPUT", format!("Codex 结果读取失败：{error}")))
}

struct ProcessCapture {
    status: ExitStatus,
    stdout: Vec<String>,
    stderr: String,
}

fn run_cli<F>(
    executable: &Path,
    arguments: &[OsString],
    stdin: Option<&str>,
    timeout: Duration,
    mut on_stdout: F,
) -> Result<ProcessCapture, AppError>
where
    F: FnMut(&str),
{
    let mut command = Command::new(executable);
    command
        .args(arguments)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let mut child = command.spawn().map_err(|error| {
        AppError::new("PROVIDER_NOT_FOUND", format!("无法启动 Codex CLI：{error}"))
    })?;
    if let Some(value) = stdin {
        let mut pipe = child
            .stdin
            .take()
            .ok_or_else(|| AppError::new("PROVIDER_START_FAILED", "无法打开 Codex 标准输入"))?;
        pipe.write_all(value.as_bytes()).map_err(|error| {
            AppError::new(
                "PROVIDER_START_FAILED",
                format!("Codex 输入写入失败：{error}"),
            )
        })?;
    } else {
        drop(child.stdin.take());
    }
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::new("PROVIDER_START_FAILED", "无法读取 Codex 标准输出"))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| AppError::new("PROVIDER_START_FAILED", "无法读取 Codex 错误输出"))?;
    let (sender, receiver) = mpsc::channel();
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
    let deadline = Instant::now() + timeout;
    let mut lines = Vec::new();
    let status = loop {
        while let Ok(line) = receiver.try_recv() {
            on_stdout(&line);
            if lines.iter().map(String::len).sum::<usize>() < MAX_DIAGNOSTIC_BYTES {
                lines.push(line);
            }
        }
        if let Some(status) = child.try_wait().map_err(|error| {
            AppError::new("PROVIDER_ERROR", format!("Codex 状态读取失败：{error}"))
        })? {
            break status;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(AppError::new(
                "PROVIDER_TIMEOUT",
                "Codex 整理超过 180 秒，已终止",
            ));
        }
        thread::sleep(Duration::from_millis(40));
    };
    let _ = stdout_thread.join();
    while let Ok(line) = receiver.try_recv() {
        on_stdout(&line);
        lines.push(line);
    }
    let stderr = stderr_thread
        .join()
        .unwrap_or_else(|_| "Codex 错误输出读取失败".into());
    Ok(ProcessCapture {
        status,
        stdout: lines,
        stderr,
    })
}
