use super::protocol::{ApprovalResult, CardChanges};
use super::state::{AgentRuntimeState, PendingAction, PendingApproval};
use crate::domain::{Card, CardAsset, CardInput};
use crate::error::AppError;
use crate::storage::Storage;

pub fn resolve_approval(
    storage: &Storage,
    state: &AgentRuntimeState,
    approval_id: &str,
    approved: bool,
) -> Result<ApprovalResult, AppError> {
    let pending = state.take(approval_id)?;
    if !approved {
        cleanup_assets(storage, &pending.assets);
        return Ok(ApprovalResult {
            run_id: pending.run_id,
            approved: false,
            message: "已拒绝操作，没有修改数据。".into(),
            card: None,
            deleted_card_id: None,
        });
    }
    let result = execute_pending(storage, &pending);
    if result.is_err() {
        cleanup_assets(storage, &pending.assets);
    }
    result
}

fn execute_pending(
    storage: &Storage,
    pending: &PendingApproval,
) -> Result<ApprovalResult, AppError> {
    let (message, card, deleted_card_id) = match &pending.action {
        PendingAction::Create { input } => {
            let mut value = input.clone();
            value.assets = pending.assets.clone();
            (
                "卡片已创建。".into(),
                Some(storage.save_card(value, None, None, false)?),
                None,
            )
        }
        PendingAction::Update {
            card_id,
            expected_revision,
            changes,
        } => {
            let card = storage.get_card(card_id)?;
            let mut input = card_input(&card);
            apply_changes(&mut input, changes);
            input.assets.extend(pending.assets.clone());
            let saved = storage.save_card(
                input,
                Some(card_id.clone()),
                Some(*expected_revision),
                false,
            )?;
            (
                format!("卡片已更新到 revision {}。", saved.revision),
                Some(saved),
                None,
            )
        }
        PendingAction::Delete {
            card_id,
            expected_revision,
        } => {
            storage.delete_card_if_revision(card_id, *expected_revision)?;
            cleanup_assets(storage, &pending.assets);
            ("卡片已删除。".into(), None, Some(card_id.clone()))
        }
    };
    Ok(ApprovalResult {
        run_id: pending.run_id.clone(),
        approved: true,
        message,
        card,
        deleted_card_id,
    })
}

fn card_input(card: &Card) -> CardInput {
    CardInput {
        subject: card.subject.clone(),
        question: card.question.clone(),
        user_answer: card.user_answer.clone(),
        correct_answer: card.correct_answer.clone(),
        supplemental_note: card.supplemental_note.clone(),
        solution: card.solution.clone(),
        error_location: card.error_location.clone(),
        error_reason: card.error_reason.clone(),
        error_type: card.error_type.clone(),
        knowledge_points: card.knowledge_points.clone(),
        assets: card.assets.clone(),
    }
}

fn apply_changes(input: &mut CardInput, changes: &CardChanges) {
    macro_rules! replace {
        ($field:ident) => {
            if let Some(value) = &changes.$field {
                input.$field = value.clone();
            }
        };
    }
    replace!(subject);
    replace!(question);
    replace!(user_answer);
    replace!(correct_answer);
    replace!(supplemental_note);
    replace!(solution);
    replace!(error_location);
    replace!(error_reason);
    replace!(error_type);
    replace!(knowledge_points);
}

pub(super) fn cleanup_assets(storage: &Storage, assets: &[CardAsset]) {
    for asset in assets {
        let _ = storage.delete_asset(&asset.id);
    }
}
