use super::card_records::{load_card, sync_assets, sync_knowledge_points};
use super::Storage;
use crate::domain::{calculate_status, validate_input, Card, PracticeCardDraft};
use crate::error::AppError;
use chrono::Utc;
use rusqlite::{params, OptionalExtension};
use uuid::Uuid;

impl Storage {
    pub fn save_practice_cards(
        &self,
        drafts: Vec<PracticeCardDraft>,
    ) -> Result<Vec<Card>, AppError> {
        if drafts.is_empty() {
            return Err(AppError::validation("至少需要生成一张习题卡"));
        }
        for draft in &drafts {
            validate_input(&draft.input)?;
            if draft.source_revisions.is_empty() {
                return Err(AppError::validation("习题卡必须保留来源错题版本"));
            }
        }
        let now = Utc::now().to_rfc3339();
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        let mut ids = Vec::with_capacity(drafts.len());
        for draft in drafts {
            for source in &draft.source_revisions {
                let revision: Option<u64> = transaction
                    .query_row(
                        "SELECT revision FROM cards WHERE id=?1 AND kind='mistake'",
                        [&source.card_id],
                        |row| row.get(0),
                    )
                    .optional()?;
                if revision != Some(source.revision) {
                    return Err(AppError::new(
                        "REVISION_CONFLICT",
                        "来源错题已变化，请重新选择后生成",
                    ));
                }
            }
            let id = Uuid::new_v4().to_string();
            let status = calculate_status(&draft.input);
            transaction.execute(
                "INSERT INTO cards (id, subject, question, user_answer, correct_answer, supplemental_note, solution, error_location, error_reason, error_type, status, kind, revision, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'practice',1,?12,?12)",
                params![id, draft.input.subject.trim(), draft.input.question, draft.input.user_answer,
                    draft.input.correct_answer, draft.input.supplemental_note, draft.input.solution,
                    draft.input.error_location, draft.input.error_reason, draft.input.error_type,
                    status.as_str(), now],
            )?;
            sync_assets(&transaction, &id, &draft.input.assets)?;
            sync_knowledge_points(&transaction, &id, &draft.input.knowledge_points, &now)?;
            for (index, source) in draft.source_revisions.iter().enumerate() {
                transaction.execute(
                    "INSERT INTO practice_card_sources (practice_card_id, source_card_id, source_revision, sort_order) VALUES (?1,?2,?3,?4)",
                    params![id, source.card_id, source.revision, index as u64],
                )?;
            }
            ids.push(id);
        }
        transaction.commit()?;
        ids.into_iter()
            .map(|id| load_card(&connection, &id))
            .collect()
    }
}
