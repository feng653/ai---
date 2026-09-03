use super::Storage;
use crate::domain::{
    GeneratedKnowledgeCard, KnowledgeCardRecord, KnowledgeCardSaveInput, KnowledgeCardStatus,
};
use crate::error::AppError;
use chrono::Utc;
use rusqlite::{params, Row};

impl Storage {
    pub fn list_knowledge_cards(&self) -> Result<Vec<KnowledgeCardRecord>, AppError> {
        let connection = self.lock()?;
        let mut statement = connection.prepare(
            "SELECT key, subject, chapter, name, status, content_json, created_at, updated_at
             FROM knowledge_cards ORDER BY updated_at DESC",
        )?;
        let rows = statement.query_map([], row_to_record)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn save_knowledge_card(
        &self,
        input: KnowledgeCardSaveInput,
    ) -> Result<KnowledgeCardRecord, AppError> {
        validate(&input)?;
        let mut connection = self.lock()?;
        let transaction = connection.transaction()?;
        for source in &input.content.source_revisions {
            let revision: u64 = transaction
                .query_row(
                    "SELECT revision FROM cards WHERE id = ?1",
                    [&source.card_id],
                    |row| row.get(0),
                )
                .map_err(|_| AppError::new("REVISION_CONFLICT", "来源错题已删除或版本已变化"))?;
            if revision != source.revision {
                return Err(AppError::new(
                    "REVISION_CONFLICT",
                    "来源错题版本已变化，请重新生成知识卡片",
                ));
            }
        }
        let content = serde_json::to_string(&input.content).map_err(json_error)?;
        let now = Utc::now().to_rfc3339();
        transaction.execute(
            "INSERT INTO knowledge_cards
             (key, subject, chapter, name, status, content_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
             ON CONFLICT(key) DO UPDATE SET subject=?2, chapter=?3, name=?4,
             status=?5, content_json=?6, updated_at=?7",
            params![
                input.key,
                input.subject.trim(),
                input.chapter.as_deref().map(str::trim),
                input.name.trim(),
                input.status.as_str(),
                content,
                now,
            ],
        )?;
        transaction.commit()?;
        drop(connection);
        self.get_knowledge_card(&input.key)
    }

    pub fn delete_knowledge_card(&self, key: &str) -> Result<(), AppError> {
        let changed = self
            .lock()?
            .execute("DELETE FROM knowledge_cards WHERE key = ?1", [key])?;
        if changed == 0 {
            return Err(AppError::new("NOT_FOUND", "知识卡片草稿不存在"));
        }
        Ok(())
    }

    fn get_knowledge_card(&self, key: &str) -> Result<KnowledgeCardRecord, AppError> {
        self.lock()?
            .query_row(
                "SELECT key, subject, chapter, name, status, content_json, created_at, updated_at
                 FROM knowledge_cards WHERE key = ?1",
                [key],
                row_to_record,
            )
            .map_err(Into::into)
    }
}

fn row_to_record(row: &Row<'_>) -> rusqlite::Result<KnowledgeCardRecord> {
    let status: String = row.get(4)?;
    let content: String = row.get(5)?;
    Ok(KnowledgeCardRecord {
        key: row.get(0)?,
        subject: row.get(1)?,
        chapter: row.get(2)?,
        name: row.get(3)?,
        status: if status == "saved" {
            KnowledgeCardStatus::Saved
        } else {
            KnowledgeCardStatus::Draft
        },
        content: serde_json::from_str::<GeneratedKnowledgeCard>(&content).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(
                5,
                rusqlite::types::Type::Text,
                Box::new(error),
            )
        })?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn validate(input: &KnowledgeCardSaveInput) -> Result<(), AppError> {
    if input.key.trim().is_empty()
        || input.subject.trim().is_empty()
        || input.name.trim().is_empty()
    {
        return Err(AppError::validation("知识卡片标识、学科和名称不能为空"));
    }
    if input.content.core_method.trim().is_empty()
        || input.content.mistake_reminder.trim().is_empty()
        || input.content.source_revisions.is_empty()
    {
        return Err(AppError::validation("知识卡片草稿内容不完整"));
    }
    Ok(())
}

fn json_error(error: serde_json::Error) -> AppError {
    AppError::new("INVALID_INPUT", format!("知识卡片序列化失败：{error}"))
}
