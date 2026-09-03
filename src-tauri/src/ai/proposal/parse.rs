use super::{
    clean, AiAction, AiCardProposal, AiProposal, AiProposalFields, AiSource, ProposedField,
    PROMPT_VERSION,
};
use crate::domain::{CardInput, KnowledgePoint};
use crate::error::AppError;
use serde::Deserialize;

const MAX_CARD_PROPOSALS: usize = 10;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawFields {
    question: Option<ProposedField<String>>,
    user_answer: Option<ProposedField<String>>,
    correct_answer: Option<ProposedField<String>>,
    solution: Option<ProposedField<String>>,
    error_location: Option<ProposedField<String>>,
    error_reason: Option<ProposedField<String>>,
    error_type: Option<ProposedField<String>>,
    knowledge_points: Option<ProposedField<Vec<KnowledgePoint>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawCardProposal {
    #[serde(flatten)]
    fields: RawFields,
    #[serde(default)]
    warnings: Vec<String>,
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
    #[serde(flatten)]
    fields: RawFields,
    #[serde(default)]
    warnings: Vec<String>,
    #[serde(default)]
    cards: Vec<RawCardProposal>,
}

pub(super) fn parse_output(
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
    let action = choose_action(output.action, agent_mode, has_target)?;
    if action != AiAction::CreateCard && !output.cards.is_empty() {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            "只有创建卡片时才能返回多张卡片提案",
        ));
    }
    if output.cards.len() > MAX_CARD_PROPOSALS {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            format!("一次最多生成 {MAX_CARD_PROPOSALS} 张卡片提案"),
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
    let (fields, warnings, cards) = if action == AiAction::Reply {
        (
            AiProposalFields::default(),
            clean::warnings(output.warnings),
            Vec::new(),
        )
    } else {
        let (fields, warnings) = clean_card(output.fields, output.warnings, input);
        let cards = output
            .cards
            .into_iter()
            .map(|card| {
                let (fields, warnings) = clean_card(card.fields, card.warnings, input);
                AiCardProposal { fields, warnings }
            })
            .collect();
        (fields, warnings, cards)
    };
    Ok(AiProposal {
        run_id,
        base_revision,
        prompt_version: PROMPT_VERSION,
        action,
        message,
        sources,
        fields,
        warnings,
        cards,
    })
}

fn choose_action(
    action: Option<AiAction>,
    agent_mode: bool,
    has_target: bool,
) -> Result<AiAction, AppError> {
    let action = if agent_mode {
        action.ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "Agent 响应缺少 action"))?
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
    Ok(action)
}

fn clean_card(
    raw: RawFields,
    raw_warnings: Vec<String>,
    input: &CardInput,
) -> (AiProposalFields, Vec<String>) {
    let mut fields = AiProposalFields {
        question: clean::text(raw.question),
        user_answer: clean::text(raw.user_answer),
        correct_answer: clean::text(raw.correct_answer),
        solution: clean::text(raw.solution),
        error_location: clean::text(raw.error_location),
        error_reason: clean::text(raw.error_reason),
        error_type: clean::text(raw.error_type),
        knowledge_points: clean::points(raw.knowledge_points),
    };
    let mut warnings = clean::warnings(raw_warnings);
    if input.user_answer.trim().is_empty() {
        fields.error_location = None;
        fields.error_reason = None;
        fields.error_type = Some(ProposedField::uncertain(
            "无法判断".into(),
            "没有用户作答过程",
        ));
        clean::add_warning(&mut warnings, "缺少作答过程，暂时无法判断具体错误原因。");
    }
    (fields, warnings)
}
