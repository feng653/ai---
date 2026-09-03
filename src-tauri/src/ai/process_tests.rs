use super::codex::CodexProvider;
use super::process::{build_arguments, ExecutionPaths};
use std::ffi::OsString;
use std::path::Path;

#[test]
fn live_search_is_a_global_codex_option() {
    let paths = ExecutionPaths {
        work_dir: Path::new("work"),
        schema: Path::new("schema.json"),
        output: Path::new("output.json"),
        codex_home: Path::new("codex-home"),
    };
    let with_search = build_arguments(&paths, &[], true);
    let without_search = build_arguments(&paths, &[], false);
    assert_eq!(with_search.first(), Some(&OsString::from("--search")));
    assert_eq!(with_search.get(1), Some(&OsString::from("exec")));
    assert_eq!(without_search.first(), Some(&OsString::from("exec")));
}

#[test]
fn refuses_auth_changes_while_codex_is_busy() {
    let directory = tempfile::tempdir().unwrap();
    let provider = CodexProvider::new(directory.path());
    let _running = provider.run_lock.lock().unwrap();
    assert_eq!(provider.login().unwrap_err().code, "RUN_IN_PROGRESS");
    assert_eq!(provider.disconnect().unwrap_err().code, "RUN_IN_PROGRESS");
}

#[cfg(windows)]
#[test]
fn managed_child_exits_when_its_job_handle_closes() {
    use super::process_windows::assign_kill_on_close;
    use std::process::{Command, Stdio};
    use std::thread;
    use std::time::{Duration, Instant};

    let mut child = Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "[Threading.Thread]::Sleep(30000)",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let job = assign_kill_on_close(&child).unwrap();
    drop(job);

    let deadline = Instant::now() + Duration::from_secs(3);
    while Instant::now() < deadline {
        if child.try_wait().unwrap().is_some() {
            child.wait().unwrap();
            return;
        }
        thread::sleep(Duration::from_millis(20));
    }
    let _ = child.kill();
    let _ = child.wait();
    panic!("managed child remained alive after its job handle closed");
}
