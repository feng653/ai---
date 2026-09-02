use super::process::{prepare_codex_home, run_cli};
use super::process_error::diagnostic;
use crate::error::AppError;
use std::ffi::OsString;
use std::path::Path;
use std::time::Duration;

const PROBE_TIMEOUT: Duration = Duration::from_secs(10);
const LOGIN_TIMEOUT: Duration = Duration::from_secs(10 * 60);

pub fn login(executable: &Path, home: &Path) -> Result<(), AppError> {
    prepare_codex_home(home)?;
    let result = run_cli(
        executable,
        &[OsString::from("login")],
        None,
        LOGIN_TIMEOUT,
        |_| {},
        home,
    )?;
    if result.status.success() {
        Ok(())
    } else {
        Err(AppError::new(
            "AUTH_REQUIRED",
            diagnostic("Codex 网页登录未完成", &result.stderr, &result.stdout),
        ))
    }
}

pub fn logout(executable: &Path, home: &Path) -> Result<(), AppError> {
    prepare_codex_home(home)?;
    let result = run_cli(
        executable,
        &[OsString::from("logout")],
        None,
        PROBE_TIMEOUT,
        |_| {},
        home,
    )?;
    if result.status.success() {
        Ok(())
    } else {
        Err(AppError::new(
            "PROVIDER_ERROR",
            diagnostic("Codex 退出登录失败", &result.stderr, &result.stdout),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_an_isolated_file_credential_policy() {
        let parent = tempfile::tempdir().unwrap();
        let home = parent.path().join("zhishi-codex");
        prepare_codex_home(&home).unwrap();
        assert_eq!(
            std::fs::read_to_string(home.join("config.toml")).unwrap(),
            "cli_auth_credentials_store = \"file\"\n"
        );
        assert!(!parent.path().join("auth.json").exists());
    }
}
