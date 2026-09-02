use crate::error::AppError;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSummary {
    pub id: String,
    pub name: String,
    pub state: String,
    pub message: String,
    pub active: bool,
    pub configured: bool,
    pub base_url: Option<String>,
    pub model: Option<String>,
}

pub(super) struct RunningGuard<'a>(&'a AtomicBool);

impl<'a> RunningGuard<'a> {
    pub(super) fn acquire(value: &'a AtomicBool) -> Result<Self, AppError> {
        value
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Self(value))
            .map_err(|_| AppError::new("RUN_IN_PROGRESS", "已有 AI 整理任务正在运行"))
    }
}

impl Drop for RunningGuard<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}
