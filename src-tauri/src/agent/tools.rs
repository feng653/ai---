use super::protocol::{ApprovalView, ModelToolCall, ToolManifestView};
use super::state::PendingAction;
use crate::domain::CardFilter;
use crate::error::AppError;
use crate::storage::Storage;
use serde_json::json;
use uuid::Uuid;

pub const TOOLS: [ToolManifestView; 6] = [
    manifest("cards.search", "搜索错题卡片", false),
    manifest("cards.get", "读取卡片详情", false),
    manifest("knowledge.search", "搜索已有知识点", false),
    manifest("cards.create", "创建一张卡片", true),
    manifest("cards.update", "更新指定卡片字段", true),
    manifest("cards.delete", "删除指定卡片", true),
];

const fn manifest(
    name: &'static str,
    description: &'static str,
    side_effect: bool,
) -> ToolManifestView {
    ToolManifestView {
        name,
        description,
        side_effect,
        approval_required: side_effect,
    }
}

pub enum ToolOutcome {
    Observation(String),
    Approval {
        view: ApprovalView,
        action: Box<PendingAction>,
    },
}

pub fn execute(
    storage: &Storage,
    call_id: &str,
    call: ModelToolCall,
) -> Result<ToolOutcome, AppError> {
    match call.name.as_str() {
        "cards.search" => search_cards(storage, required(call.query, "query")?),
        "cards.get" => get_card(storage, required(call.card_id, "cardId")?),
        "knowledge.search" => search_knowledge(storage, required(call.query, "query")?),
        "cards.create" => {
            let input = required(call.input, "input")?;
            let title = compact_title(&input.question);
            approval(
                call_id,
                "cards.create",
                title,
                "创建新卡片",
                PendingAction::Create { input },
            )
        }
        "cards.update" => {
            let card_id = required(call.card_id, "cardId")?;
            let revision = required(call.expected_revision, "expectedRevision")?;
            let changes = required(call.changes, "changes")?;
            let card = storage.get_card(&card_id)?;
            if card.revision != revision {
                return Err(AppError::new(
                    "REVISION_CONFLICT",
                    "卡片版本已变化，请重新读取",
                ));
            }
            approval(
                call_id,
                "cards.update",
                compact_title(&card.question),
                "更新模型明确提出的卡片字段",
                PendingAction::Update {
                    card_id,
                    expected_revision: revision,
                    changes,
                },
            )
        }
        "cards.delete" => {
            let card_id = required(call.card_id, "cardId")?;
            let revision = required(call.expected_revision, "expectedRevision")?;
            let card = storage.get_card(&card_id)?;
            if card.revision != revision {
                return Err(AppError::new(
                    "REVISION_CONFLICT",
                    "卡片版本已变化，请重新读取",
                ));
            }
            approval(
                call_id,
                "cards.delete",
                compact_title(&card.question),
                "删除整张卡片及关联图片",
                PendingAction::Delete {
                    card_id,
                    expected_revision: revision,
                },
            )
        }
        _ => Err(AppError::new(
            "TOOL_NOT_FOUND",
            format!("未知工具：{}", call.name),
        )),
    }
}

fn search_cards(storage: &Storage, query: String) -> Result<ToolOutcome, AppError> {
    let cards = storage.list_cards(CardFilter {
        query: Some(query),
        ..Default::default()
    })?;
    let rows = cards
        .into_iter()
        .take(8)
        .map(|card| {
            json!({
                "id": card.id, "revision": card.revision, "subject": card.subject,
                "question": card.question, "status": card.status,
            })
        })
        .collect::<Vec<_>>();
    observation(json!({ "count": rows.len(), "cards": rows }))
}

fn get_card(storage: &Storage, card_id: String) -> Result<ToolOutcome, AppError> {
    observation(serde_json::to_value(storage.get_card(&card_id)?).map_err(json_error)?)
}

fn search_knowledge(storage: &Storage, query: String) -> Result<ToolOutcome, AppError> {
    let cards = storage.list_cards(CardFilter {
        query: Some(query),
        ..Default::default()
    })?;
    let mut points = cards
        .into_iter()
        .flat_map(|card| card.knowledge_points)
        .collect::<Vec<_>>();
    points
        .sort_by(|a, b| (&a.subject, &a.chapter, &a.name).cmp(&(&b.subject, &b.chapter, &b.name)));
    points.dedup_by(|a, b| a.subject == b.subject && a.chapter == b.chapter && a.name == b.name);
    observation(
        json!({ "count": points.len(), "knowledgePoints": points.into_iter().take(20).collect::<Vec<_>>() }),
    )
}

fn approval(
    call_id: &str,
    tool: &str,
    title: String,
    impact: &str,
    action: PendingAction,
) -> Result<ToolOutcome, AppError> {
    Ok(ToolOutcome::Approval {
        view: ApprovalView {
            approval_id: Uuid::new_v4().to_string(),
            call_id: call_id.into(),
            tool_name: tool.into(),
            title,
            impact: impact.into(),
        },
        action: Box::new(action),
    })
}

fn observation(value: serde_json::Value) -> Result<ToolOutcome, AppError> {
    serde_json::to_string(&value)
        .map(ToolOutcome::Observation)
        .map_err(json_error)
}

fn required<T>(value: Option<T>, field: &str) -> Result<T, AppError> {
    value.ok_or_else(|| AppError::validation(format!("工具参数缺少 {field}")))
}

fn compact_title(value: &str) -> String {
    let text = value.split_whitespace().collect::<Vec<_>>().join(" ");
    text.chars().take(60).collect()
}

fn json_error(error: serde_json::Error) -> AppError {
    AppError::new(
        "INVALID_TOOL_RESULT",
        format!("工具结果序列化失败：{error}"),
    )
}
