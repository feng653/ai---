use crate::error::AppError;
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK,
};

pub(super) fn assign_kill_on_close(child: &std::process::Child) -> Result<OwnedHandle, AppError> {
    let raw_job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    if raw_job.is_null() {
        return Err(job_error("无法创建 Codex 进程托管任务"));
    }
    let job = unsafe { OwnedHandle::from_raw_handle(raw_job) };
    let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
    limits.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK;
    let configured = unsafe {
        SetInformationJobObject(
            job.as_raw_handle(),
            JobObjectExtendedLimitInformation,
            std::ptr::from_ref(&limits).cast(),
            std::mem::size_of_val(&limits) as u32,
        )
    };
    if configured == 0 {
        return Err(job_error("无法配置 Codex 进程托管任务"));
    }
    let assigned = unsafe { AssignProcessToJobObject(job.as_raw_handle(), child.as_raw_handle()) };
    if assigned == 0 {
        return Err(job_error("无法托管 Codex 子进程"));
    }
    Ok(job)
}

fn job_error(message: &str) -> AppError {
    AppError::new(
        "PROVIDER_START_FAILED",
        format!("{message}：{}", std::io::Error::last_os_error()),
    )
}
