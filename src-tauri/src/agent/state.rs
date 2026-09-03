use super::protocol::{ApprovalView, CardChanges, StartTurnRequest};
use crate::domain::{CardAsset, CardInput};
use crate::error::AppError;
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, MutexGuard};

#[derive(Debug, Clone)]
pub enum PendingAction {
    Create {
        input: CardInput,
    },
    Update {
        card_id: String,
        expected_revision: u64,
        changes: CardChanges,
    },
    Delete {
        card_id: String,
        expected_revision: u64,
    },
}

#[derive(Debug, Clone)]
pub struct PendingApproval {
    pub run_id: String,
    pub view: ApprovalView,
    pub action: PendingAction,
    pub assets: Vec<CardAsset>,
    pub continuation: Option<RunContinuation>,
}

#[derive(Debug, Clone)]
pub struct RunContinuation {
    pub request: StartTurnRequest,
    pub observations: Vec<String>,
    pub next_step: usize,
    pub owns_assets: bool,
}

#[derive(Default)]
struct RuntimeData {
    pending: HashMap<String, PendingApproval>,
    cancelled: HashSet<String>,
}

#[derive(Default)]
pub struct AgentRuntimeState {
    inner: Mutex<RuntimeData>,
}

impl AgentRuntimeState {
    fn lock(&self) -> Result<MutexGuard<'_, RuntimeData>, AppError> {
        self.inner
            .lock()
            .map_err(|_| AppError::new("AGENT_STATE_ERROR", "Agent 状态锁已损坏"))
    }

    pub fn prepare_run(&self, run_id: &str) -> Result<(), AppError> {
        if run_id.trim().is_empty() || run_id.len() > 100 {
            return Err(AppError::validation("runId 无效"));
        }
        self.lock()?.cancelled.remove(run_id);
        Ok(())
    }

    pub fn cancel(&self, run_id: &str) -> Result<(), AppError> {
        self.lock()?.cancelled.insert(run_id.into());
        Ok(())
    }

    pub fn is_cancelled(&self, run_id: &str) -> Result<bool, AppError> {
        Ok(self.lock()?.cancelled.contains(run_id))
    }

    pub fn finish_run(&self, run_id: &str) -> Result<(), AppError> {
        self.lock()?.cancelled.remove(run_id);
        Ok(())
    }

    pub fn insert(&self, pending: PendingApproval) -> Result<(), AppError> {
        let mut state = self.lock()?;
        if state.pending.contains_key(&pending.view.approval_id) {
            return Err(AppError::new("DUPLICATE_APPROVAL", "批准请求已存在"));
        }
        state
            .pending
            .insert(pending.view.approval_id.clone(), pending);
        Ok(())
    }

    pub fn take(&self, approval_id: &str) -> Result<PendingApproval, AppError> {
        self.lock()?
            .pending
            .remove(approval_id)
            .ok_or_else(|| AppError::new("APPROVAL_NOT_FOUND", "批准请求不存在或已处理"))
    }
}
