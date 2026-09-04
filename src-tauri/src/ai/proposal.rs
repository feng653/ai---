use crate::domain::{CardInput, KnowledgePoint};
use crate::error::AppError;
use serde::{Deserialize, Serialize};

mod clean;
mod parse;

pub use super::prompt::build_prompt;

pub const PROMPT_VERSION: &str = "agent-choice-v7-additional-requirements";

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AiAction {
    Reply,
    CreateCard,
    UpdateCard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSource {
    title: String,
    url: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ProposalSource {
    Image,
    UserText,
    Inference,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposedField<T> {
    value: T,
    uncertain: bool,
    uncertain_reason: Option<String>,
    source: ProposalSource,
}

impl<T> ProposedField<T> {
    fn uncertain(value: T, reason: &str) -> Self {
        Self {
            value,
            uncertain: true,
            uncertain_reason: Some(reason.into()),
            source: ProposalSource::Inference,
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProposalFields {
    #[serde(skip_serializing_if = "Option::is_none")]
    question: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    user_answer: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    correct_answer: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    solution: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_location: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_reason: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_type: Option<ProposedField<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    knowledge_points: Option<ProposedField<Vec<KnowledgePoint>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCardProposal {
    fields: AiProposalFields,
    warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProposal {
    run_id: String,
    base_revision: u64,
    prompt_version: &'static str,
    action: AiAction,
    message: String,
    sources: Vec<AiSource>,
    fields: AiProposalFields,
    warnings: Vec<String>,
    cards: Vec<AiCardProposal>,
}

pub fn parse_proposal(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
) -> Result<AiProposal, AppError> {
    parse::parse_output(json, input, run_id, base_revision, false, false, false)
}

pub fn parse_agent_response(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
    has_target: bool,
    web_search: bool,
) -> Result<AiProposal, AppError> {
    parse::parse_output(
        json,
        input,
        run_id,
        base_revision,
        true,
        has_target,
        web_search,
    )
}
