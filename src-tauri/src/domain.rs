use crate::error::AppError;
use serde::{Deserialize, Serialize};

pub const ERROR_TYPES: [&str; 7] = [
    "概念不清",
    "方法错误",
    "公式或定理使用错误",
    "审题错误",
    "计算错误",
    "推理或步骤错误",
    "无法判断",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgePoint {
    pub id: Option<String>,
    pub subject: String,
    pub chapter: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CardAsset {
    pub id: String,
    pub relative_path: String,
    pub mime_type: String,
    pub byte_size: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardInput {
    pub subject: String,
    pub question: String,
    pub user_answer: String,
    pub correct_answer: String,
    pub supplemental_note: String,
    pub solution: String,
    pub error_location: String,
    pub error_reason: String,
    pub error_type: String,
    pub knowledge_points: Vec<KnowledgePoint>,
    pub assets: Vec<CardAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SourceRevision {
    pub card_id: String,
    pub revision: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PracticeCardDraft {
    pub input: CardInput,
    pub source_revisions: Vec<SourceRevision>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub kind: String,
    pub source_revisions: Vec<SourceRevision>,
    pub subject: String,
    pub question: String,
    pub user_answer: String,
    pub correct_answer: String,
    pub supplemental_note: String,
    pub solution: String,
    pub error_location: String,
    pub error_reason: String,
    pub error_type: String,
    pub knowledge_points: Vec<KnowledgePoint>,
    pub assets: Vec<CardAsset>,
    pub status: CardStatus,
    pub revision: u64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CardStatus {
    Draft,
    Organized,
}

impl CardStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Organized => "organized",
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardFilter {
    pub query: Option<String>,
    pub status: Option<String>,
    pub knowledge_subject: Option<String>,
    pub knowledge_chapter: Option<String>,
    pub knowledge_point: Option<String>,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    pub state: String,
    pub provider: String,
    pub executable: Option<String>,
    pub message: String,
}

fn has_text(value: &str) -> bool {
    !value.trim().is_empty()
}

pub fn calculate_status(input: &CardInput) -> CardStatus {
    if !has_text(&input.question) || input.knowledge_points.is_empty() {
        return CardStatus::Draft;
    }
    if has_text(&input.user_answer) {
        let has_diagnosis = (has_text(&input.error_location) || has_text(&input.error_reason))
            && has_text(&input.error_type);
        if has_diagnosis {
            CardStatus::Organized
        } else {
            CardStatus::Draft
        }
    } else if has_text(&input.solution) {
        CardStatus::Organized
    } else {
        CardStatus::Draft
    }
}

pub fn validate_input(input: &CardInput) -> Result<(), AppError> {
    if !has_text(&input.question) && input.assets.is_empty() {
        return Err(AppError::validation("至少需要输入题目或添加一张图片"));
    }
    if input.knowledge_points.len() > 3 {
        return Err(AppError::validation("每张卡片最多关联 3 个主要知识点"));
    }
    if !input.error_type.is_empty() && !ERROR_TYPES.contains(&input.error_type.as_str()) {
        return Err(AppError::validation("错误类型无效"));
    }
    if input
        .knowledge_points
        .iter()
        .any(|point| point.subject.trim().is_empty() || point.name.trim().is_empty())
    {
        return Err(AppError::validation("知识点的学科和名称不能为空"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> CardInput {
        CardInput {
            subject: "数学".into(),
            question: "题目".into(),
            user_answer: String::new(),
            correct_answer: String::new(),
            supplemental_note: String::new(),
            solution: String::new(),
            error_location: String::new(),
            error_reason: String::new(),
            error_type: String::new(),
            knowledge_points: vec![],
            assets: vec![],
        }
    }

    #[test]
    fn status_rules_match_typescript() {
        let mut value = input();
        assert_eq!(calculate_status(&value), CardStatus::Draft);
        value.knowledge_points.push(KnowledgePoint {
            id: None,
            subject: "数学".into(),
            chapter: Some("代数".into()),
            name: "方程".into(),
        });
        value.solution = "解法".into();
        assert_eq!(calculate_status(&value), CardStatus::Organized);
        value.user_answer = "作答".into();
        assert_eq!(calculate_status(&value), CardStatus::Draft);
        value.error_reason = "计算失误".into();
        value.error_type = "计算错误".into();
        assert_eq!(calculate_status(&value), CardStatus::Organized);
    }

    #[test]
    fn only_an_asset_meets_minimum_save_condition() {
        let mut value = input();
        value.question.clear();
        assert!(validate_input(&value).is_err());
        value.assets.push(CardAsset {
            id: "asset".into(),
            relative_path: "assets/asset.png".into(),
            mime_type: "image/png".into(),
            byte_size: 1,
            width: Some(1),
            height: Some(1),
        });
        assert!(validate_input(&value).is_ok());
        assert_eq!(calculate_status(&value), CardStatus::Draft);
    }
}
