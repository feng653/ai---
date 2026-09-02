use crate::domain::{CardInput, KnowledgePoint};
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub use super::prompt::build_prompt;

pub const PROMPT_VERSION: &str = "agent-card-v4-latex";

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CodexOutput {
    question: Option<ProposedField<String>>,
    user_answer: Option<ProposedField<String>>,
    correct_answer: Option<ProposedField<String>>,
    solution: Option<ProposedField<String>>,
    error_location: Option<ProposedField<String>>,
    error_reason: Option<ProposedField<String>>,
    error_type: Option<ProposedField<String>>,
    knowledge_points: Option<ProposedField<Vec<KnowledgePoint>>>,
    warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProposal {
    run_id: String,
    base_revision: u64,
    prompt_version: &'static str,
    fields: AiProposalFields,
    warnings: Vec<String>,
}

pub fn parse_proposal(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
) -> Result<AiProposal, AppError> {
    let output: CodexOutput = serde_json::from_str(json).map_err(|error| {
        AppError::new("INVALID_AI_OUTPUT", format!("AI 结构化输出无效：{error}"))
    })?;
    let mut fields = AiProposalFields {
        question: clean_text(output.question),
        user_answer: clean_text(output.user_answer),
        correct_answer: clean_text(output.correct_answer),
        solution: clean_text(output.solution),
        error_location: clean_text(output.error_location),
        error_reason: clean_text(output.error_reason),
        error_type: clean_text(output.error_type),
        knowledge_points: clean_points(output.knowledge_points),
    };
    let mut warnings = clean_warnings(output.warnings);
    if input.user_answer.trim().is_empty() {
        fields.error_location = None;
        fields.error_reason = None;
        fields.error_type = Some(ProposedField::uncertain(
            "无法判断".into(),
            "没有用户作答过程",
        ));
        add_warning(&mut warnings, "缺少作答过程，暂时无法判断具体错误原因。");
    }
    Ok(AiProposal {
        run_id,
        base_revision,
        prompt_version: PROMPT_VERSION,
        fields,
        warnings,
    })
}

fn clean_text(mut field: Option<ProposedField<String>>) -> Option<ProposedField<String>> {
    let value = field.as_mut()?;
    value.value = normalize_math_delimiters(value.value.trim());
    if value.value.is_empty() {
        return None;
    }
    clean_uncertainty(value);
    field
}

fn normalize_math_delimiters(value: &str) -> String {
    value
        .replace("\\[", "\n\n$$\n")
        .replace("\\]", "\n$$\n\n")
        .replace("\\(", "$")
        .replace("\\)", "$")
}

fn clean_points(
    mut field: Option<ProposedField<Vec<KnowledgePoint>>>,
) -> Option<ProposedField<Vec<KnowledgePoint>>> {
    let value = field.as_mut()?;
    for point in &mut value.value {
        point.id = None;
        point.subject = point.subject.trim().to_owned();
        point.chapter = point
            .chapter
            .take()
            .map(|item| item.trim().to_owned())
            .filter(|item| !item.is_empty());
        point.name = point.name.trim().to_owned();
    }
    value
        .value
        .retain(|point| !point.subject.is_empty() && !point.name.is_empty());
    value.value.truncate(3);
    if value.value.is_empty() {
        return None;
    }
    clean_uncertainty(value);
    field
}

fn clean_uncertainty<T>(field: &mut ProposedField<T>) {
    field.uncertain_reason = field
        .uncertain_reason
        .take()
        .map(|reason| reason.trim().to_owned())
        .filter(|reason| !reason.is_empty());
    if field.uncertain && field.uncertain_reason.is_none() {
        field.uncertain_reason = Some("AI 标记此项为不确定".into());
    }
    if !field.uncertain {
        field.uncertain_reason = None;
    }
}

fn clean_warnings(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty() && seen.insert(value.clone()))
        .take(8)
        .collect()
}

fn add_warning(warnings: &mut Vec<String>, warning: &str) {
    if !warnings.iter().any(|item| item == warning) {
        warnings.push(warning.into());
    }
}
