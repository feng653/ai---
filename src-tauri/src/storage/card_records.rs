use crate::domain::{Card, CardAsset, CardStatus, KnowledgePoint};
use crate::error::AppError;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use uuid::Uuid;

pub(super) fn load_card(connection: &Connection, id: &str) -> Result<Card, AppError> {
    let mut card = connection.query_row(
        "SELECT id, subject, question, user_answer, correct_answer, supplemental_note, solution, error_location, error_reason, error_type, status, revision, created_at, updated_at FROM cards WHERE id = ?1",
        [id],
        |row| {
            let status: String = row.get(10)?;
            Ok(Card {
                id: row.get(0)?, subject: row.get(1)?, question: row.get(2)?,
                user_answer: row.get(3)?, correct_answer: row.get(4)?,
                supplemental_note: row.get(5)?, solution: row.get(6)?,
                error_location: row.get(7)?, error_reason: row.get(8)?, error_type: row.get(9)?,
                status: if status == "organized" { CardStatus::Organized } else { CardStatus::Draft },
                revision: row.get(11)?, created_at: row.get(12)?, updated_at: row.get(13)?,
                knowledge_points: vec![], assets: vec![],
            })
        },
    ).optional()?.ok_or_else(|| AppError::new("NOT_FOUND", "卡片不存在"))?;
    let mut points = connection.prepare("SELECT kp.id, kp.subject, kp.chapter, kp.name FROM knowledge_points kp JOIN card_knowledge_points ckp ON ckp.knowledge_point_id=kp.id WHERE ckp.card_id=?1 ORDER BY ckp.sort_order")?;
    card.knowledge_points = points
        .query_map([id], |row| {
            Ok(KnowledgePoint {
                id: Some(row.get(0)?),
                subject: row.get(1)?,
                chapter: row.get(2)?,
                name: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut assets = connection.prepare("SELECT id, relative_path, mime_type, byte_size, width, height FROM card_assets WHERE card_id=?1 ORDER BY sort_order")?;
    card.assets = assets
        .query_map([id], |row| {
            Ok(CardAsset {
                id: row.get(0)?,
                relative_path: row.get(1)?,
                mime_type: row.get(2)?,
                byte_size: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(card)
}

pub(super) fn sync_assets(
    transaction: &Transaction<'_>,
    card_id: &str,
    assets: &[CardAsset],
) -> Result<(), AppError> {
    transaction.execute(
        "UPDATE card_assets SET card_id=NULL, sort_order=0 WHERE card_id=?1",
        [card_id],
    )?;
    for (index, asset) in assets.iter().enumerate() {
        let changed = transaction.execute(
            "UPDATE card_assets SET card_id=?1, sort_order=?2 WHERE id=?3 AND (card_id IS NULL OR card_id=?1)",
            params![card_id, index as u64, asset.id],
        )?;
        if changed == 0 {
            return Err(AppError::validation(format!(
                "图片资源不存在或已被其他卡片使用：{}",
                asset.id,
            )));
        }
    }
    Ok(())
}

pub(super) fn sync_knowledge_points(
    transaction: &Transaction<'_>,
    card_id: &str,
    points: &[KnowledgePoint],
    now: &str,
) -> Result<(), AppError> {
    transaction.execute(
        "DELETE FROM card_knowledge_points WHERE card_id=?1",
        [card_id],
    )?;
    for (index, point) in points.iter().enumerate() {
        let subject = point.subject.trim();
        let chapter = point
            .chapter
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());
        let name = point.name.trim();
        let normalized = format!(
            "{}\u{1f}{}\u{1f}{}",
            subject.to_lowercase(),
            chapter.unwrap_or("").to_lowercase(),
            name.to_lowercase(),
        );
        let point_id = transaction
            .query_row(
                "SELECT id FROM knowledge_points WHERE normalized_key=?1",
                [&normalized],
                |row| row.get(0),
            )
            .optional()?
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        transaction.execute(
            "INSERT OR IGNORE INTO knowledge_points (id, subject, chapter, name, normalized_key, created_at) VALUES (?1,?2,?3,?4,?5,?6)",
            params![point_id, subject, chapter, name, normalized, now],
        )?;
        transaction.execute(
            "INSERT INTO card_knowledge_points (card_id, knowledge_point_id, sort_order, source) VALUES (?1,?2,?3,'manual')",
            params![card_id, point_id, index as u64],
        )?;
    }
    Ok(())
}

pub(super) fn select_asset_paths(
    transaction: &Transaction<'_>,
    card_id: &str,
) -> Result<Vec<String>, AppError> {
    let mut statement =
        transaction.prepare("SELECT relative_path FROM card_assets WHERE card_id=?1")?;
    let paths = statement
        .query_map([card_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(paths)
}
