use crate::domain::{CardInput, KnowledgePoint};
use crate::error::AppError;
use serde::{Deserialize, Serialize};

mod clean;

pub use super::prompt::build_prompt;

pub const PROMPT_VERSION: &str = "agent-choice-v5-search";

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CodexOutput {
    #[serde(default)]
    action: Option<AiAction>,
    #[serde(default)]
    message: String,
    #[serde(default)]
    sources: Vec<AiSource>,
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
    action: AiAction,
    message: String,
    sources: Vec<AiSource>,
    fields: AiProposalFields,
    warnings: Vec<String>,
}

pub fn parse_proposal(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
) -> Result<AiProposal, AppError> {
    parse_output(json, input, run_id, base_revision, false, false, false)
}

pub fn parse_agent_response(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
    has_target: bool,
    web_search: bool,
) -> Result<AiProposal, AppError> {
    parse_output(
        json,
        input,
        run_id,
        base_revision,
        true,
        has_target,
        web_search,
    )
}

fn parse_output(
    json: &str,
    input: &CardInput,
    run_id: String,
    base_revision: u64,
    agent_mode: bool,
    has_target: bool,
    web_search: bool,
) -> Result<AiProposal, AppError> {
    let output: CodexOutput = serde_json::from_str(json).map_err(|error| {
        AppError::new("INVALID_AI_OUTPUT", format!("AI 结构化输出无效：{error}"))
    })?;
    let action = if agent_mode {
        output
            .action
            .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "Agent 响应缺少 action"))?
    } else if has_target {
        AiAction::UpdateCard
    } else {
        AiAction::CreateCard
    };
    if action == AiAction::UpdateCard && !has_target {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            "Agent 未获得目标卡片，不能生成修改提案",
        ));
    }
    let message = output.message.trim().chars().take(8000).collect::<String>();
    if agent_mode && message.is_empty() {
        return Err(AppError::new("INVALID_AI_OUTPUT", "Agent 响应内容为空"));
    }
    let sources = if web_search {
        clean::sources(output.sources)
    } else {
        Vec::new()
    };
    if action == AiAction::Reply {
        return Ok(AiProposal {
            run_id,
            base_revision,
            prompt_version: PROMPT_VERSION,
            action,
            message,
            sources,
            fields: AiProposalFields::default(),
            warnings: clean::warnings(output.warnings),
        });
    }
    let mut fields = AiProposalFields {
        question: clean::text(output.question),
        user_answer: clean::text(output.user_answer),
        correct_answer: clean::text(output.correct_answer),
        solution: clean::text(output.solution),
        error_location: clean::text(output.error_location),
        error_reason: clean::text(output.error_reason),
        error_type: clean::text(output.error_type),
        knowledge_points: clean::points(output.knowledge_points),
    };
    let mut warnings = clean::warnings(output.warnings);
    if input.user_answer.trim().is_empty() {
        fields.error_location = None;
        fields.error_reason = None;
        fields.error_type = Some(ProposedField::uncertain(
            "无法判断".into(),
            "没有用户作答过程",
        ));
        clean::add_warning(&mut warnings, "缺少作答过程，暂时无法判断具体错误原因。");
    }
    Ok(AiProposal {
        run_id,
        base_revision,
        prompt_version: PROMPT_VERSION,
        action,
        message,
        sources,
        fields,
        warnings,
    })
}
