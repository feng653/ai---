use super::assets::remove_relative_file;
use super::card_records::{load_card, select_asset_paths, sync_assets, sync_knowledge_points};
use super::Storage;
use crate::domain::{calculate_status, validate_input, Card, CardFilter, CardInput};
use crate::error::AppError;
use chrono::Utc;
use rusqlite::{params, params_from_iter, OptionalExtension};
use uuid::Uuid;

const UNCATEGORIZED_CHAPTER_FILTER: &str = "__uncategorized__";

impl Storage {
    pub fn list_cards(&self, filter: CardFilter) -> Result<Vec<Card>, AppError> {
        let connection = self.lock()?;
        let mut sql = String::from("SELECT DISTINCT c.id FROM cards c");
        let mut conditions = Vec::new();
        let mut values = Vec::<rusqlite::types::Value>::new();
        let knowledge_subject = filter
            .knowledge_subject
            .filter(|value| !value.trim().is_empty());
        let knowledge_chapter = filter
            .knowledge_chapter
            .filter(|value| !value.trim().is_empty());
        let knowledge_point = filter
            .knowledge_point
            .filter(|value| !value.trim().is_empty());
        if knowledge_subject.is_some() || knowledge_chapter.is_some() || knowledge_point.is_some() {
            sql.push_str(" JOIN card_knowledge_points ckp ON ckp.card_id = c.id JOIN knowledge_points kp ON kp.id = ckp.knowledge_point_id");
        }
        if let Some(subject) = knowledge_subject {
            conditions.push("kp.subject = ?");
            values.push(subject.trim().to_owned().into());
        }
        if let Some(chapter) = knowledge_chapter {
            if chapter.trim() == UNCATEGORIZED_CHAPTER_FILTER {
                conditions.push("(kp.chapter IS NULL OR TRIM(kp.chapter) = '')");
            } else {
                conditions.push("kp.chapter = ?");
                values.push(chapter.trim().to_owned().into());
            }
        }
        if let Some(point) = knowledge_point {
            conditions.push("(kp.id = ? OR kp.name = ?)");
            values.push(point.trim().to_owned().into());
            values.push(point.trim().to_owned().into());
        }
        if let Some(status) = filter.status.filter(|value| value != "all") {
            if status != "draft" && status != "organized" {
                return Err(AppError::validation("卡片状态筛选值无效"));
            }
            conditions.push("c.status = ?");
            values.push(status.into());
        }
        if let Some(query) = filter.query.filter(|value| !value.trim().is_empty()) {
            sql.push_str(" LEFT JOIN card_knowledge_points qckp ON qckp.card_id = c.id LEFT JOIN knowledge_points qkp ON qkp.id = qckp.knowledge_point_id");
            conditions.push("(c.question LIKE ? ESCAPE '\\' OR c.user_answer LIKE ? ESCAPE '\\' OR c.correct_answer LIKE ? ESCAPE '\\' OR c.solution LIKE ? ESCAPE '\\' OR c.error_location LIKE ? ESCAPE '\\' OR c.error_reason LIKE ? ESCAPE '\\' OR c.error_type LIKE ? ESCAPE '\\' OR qkp.subject LIKE ? ESCAPE '\\' OR qkp.chapter LIKE ? ESCAPE '\\' OR qkp.name LIKE ? ESCAPE '\\')");
            let pattern = format!("%{}%", escape_like(query.trim()));
            for _ in 0..10 {
                values.push(pattern.clone().into());
            }
        }
        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }
        sql.push_str(" ORDER BY c.updated_at DESC");
        let ids = {
            let mut statement = connection.prepare(&sql)?;
            let rows = statement
                .query_map(params_from_iter(values), |row| row.get::<_, String>(0))?
                .collect::<Result<Vec<_>, _>>()?;
            rows
        };
        ids.into_iter()
            .map(|id| load_card(&connection, &id))
            .collect()
    }

    pub fn get_card(&self, id: &str) -> Result<Card, AppError> {
        let connection = self.lock()?;
        load_card(&connection, id)
    }

    pub fn save_card(
        &self,
        input: CardInput,
        id: Option<String>,
        expected_revision: Option<u64>,
    ) -> Result<Card, AppError> {
        validate_input(&input)?;
        let status = calculate_status(&input);
        let now = Utc::now().to_rfc3339();
        let card_id = id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        let existing: Option<u64> = transaction
            .query_row(
                "SELECT revision FROM cards WHERE id = ?1",
                [&card_id],
                |row| row.get(0),
            )
            .optional()?;
        let revision = match existing {
            Some(current) => {
                if expected_revision.is_some_and(|expected| expected != current) {
                    return Err(AppError::new(
                        "REVISION_CONFLICT",
                        format!(
                            "卡片已更新：期望版本 {}，当前版本 {current}",
                            expected_revision.unwrap()
                        ),
                    ));
                }
                let next = current + 1;
                transaction.execute(
                    "UPDATE cards SET subject=?1, question=?2, user_answer=?3, correct_answer=?4, supplemental_note=?5, solution=?6, error_location=?7, error_reason=?8, error_type=?9, status=?10, revision=?11, updated_at=?12 WHERE id=?13",
                    params![input.subject.trim(), input.question, input.user_answer, input.correct_answer, input.supplemental_note, input.solution, input.error_location, input.error_reason, input.error_type, status.as_str(), next, now, card_id],
                )?;
                next
            }
            None => {
                if expected_revision.is_some() {
                    return Err(AppError::new("NOT_FOUND", "要更新的卡片不存在"));
                }
                transaction.execute(
                    "INSERT INTO cards (id, subject, question, user_answer, correct_answer, supplemental_note, solution, error_location, error_reason, error_type, status, revision, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,1,?12,?12)",
                    params![card_id, input.subject.trim(), input.question, input.user_answer, input.correct_answer, input.supplemental_note, input.solution, input.error_location, input.error_reason, input.error_type, status.as_str(), now],
                )?;
                1
            }
        };
        sync_assets(&transaction, &card_id, &input.assets)?;
        sync_knowledge_points(&transaction, &card_id, &input.knowledge_points, &now)?;
        transaction.commit()?;
        let card = load_card(&connection, &card_id)?;
        debug_assert_eq!(card.revision, revision);
        Ok(card)
    }

    pub fn delete_card(&self, id: &str) -> Result<(), AppError> {
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        let paths = select_asset_paths(&transaction, id)?;
        if transaction.execute("DELETE FROM cards WHERE id = ?1", [id])? == 0 {
            return Err(AppError::new("NOT_FOUND", "卡片不存在"));
        }
        transaction.commit()?;
        drop(connection);
        for path in paths {
            let _ = remove_relative_file(&self.assets_dir, &path);
        }
        Ok(())
    }

    pub fn delete_card_if_revision(
        &self,
        id: &str,
        expected_revision: u64,
    ) -> Result<(), AppError> {
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        let paths = select_asset_paths(&transaction, id)?;
        let changed = transaction.execute(
            "DELETE FROM cards WHERE id = ?1 AND revision = ?2",
            params![id, expected_revision],
        )?;
        if changed == 0 {
            let exists: bool = transaction.query_row(
                "SELECT EXISTS(SELECT 1 FROM cards WHERE id = ?1)",
                [id],
                |row| row.get(0),
            )?;
            return Err(if exists {
                AppError::new("REVISION_CONFLICT", "卡片版本已变化，请重新读取")
            } else {
                AppError::new("NOT_FOUND", "卡片不存在")
            });
        }
        transaction.commit()?;
        drop(connection);
        for path in paths {
            let _ = remove_relative_file(&self.assets_dir, &path);
        }
        Ok(())
    }
}

fn escape_like(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}
