use super::SourceRevision;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedKnowledgeCard {
    pub run_id: String,
    pub prompt_version: String,
    pub core_method: String,
    pub mistake_reminder: String,
    pub source_revisions: Vec<SourceRevision>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeCardStatus {
    Draft,
    Saved,
}

impl KnowledgeCardStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Saved => "saved",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeCardRecord {
    pub key: String,
    pub subject: String,
    pub chapter: Option<String>,
    pub name: String,
    pub status: KnowledgeCardStatus,
    pub content: GeneratedKnowledgeCard,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeCardSaveInput {
    pub key: String,
    pub subject: String,
    pub chapter: Option<String>,
    pub name: String,
    pub status: KnowledgeCardStatus,
    pub content: GeneratedKnowledgeCard,
}
