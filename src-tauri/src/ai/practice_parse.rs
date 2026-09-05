use super::practice::{
    validate, PracticeGenerationRequest, PracticeMode, PracticeSourceCard, PRACTICE_PROMPT_VERSION,
};
use crate::domain::{CardInput, KnowledgePoint, PracticeCardDraft, SourceRevision};
use crate::error::AppError;
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelOutput {
    cards: Vec<GeneratedCard>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeneratedCard {
    source_card_ids: Vec<String>,
    question: String,
    correct_answer: String,
    solution: String,
}

pub fn parse_output(
    json: &str,
    request: &PracticeGenerationRequest,
) -> Result<Vec<PracticeCardDraft>, AppError> {
    validate(request)?;
    let output: ModelOutput = serde_json::from_str(json).map_err(|error| {
        AppError::new(
            "INVALID_AI_OUTPUT",
            format!("复习题结构化输出无效：{error}"),
        )
    })?;
    if output.cards.len() != request.count {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            format!(
                "AI 应生成 {} 道题，实际返回 {} 道",
                request.count,
                output.cards.len()
            ),
        ));
    }
    let sources = request
        .source_cards
        .iter()
        .map(|source| (source.id.as_str(), source))
        .collect::<HashMap<_, _>>();
    let mut covered = HashSet::new();
    let mut questions = HashSet::new();
    let mut drafts = Vec::with_capacity(output.cards.len());
    for card in output.cards {
        let GeneratedCard {
            source_card_ids,
            question,
            correct_answer,
            solution,
        } = card;
        let unique_ids = source_card_ids.iter().collect::<HashSet<_>>();
        if unique_ids.len() != source_card_ids.len() {
            return Err(AppError::new(
                "INVALID_AI_OUTPUT",
                "AI 生成题包含重复的来源卡片",
            ));
        }
        let linked = source_card_ids
            .iter()
            .map(|id| {
                sources.get(id.as_str()).copied().ok_or_else(|| {
                    AppError::new("INVALID_AI_OUTPUT", "AI 返回了不属于本次输入的来源卡片")
                })
            })
            .collect::<Result<Vec<_>, _>>()?;
        if linked.is_empty() {
            return Err(AppError::new("INVALID_AI_OUTPUT", "AI 生成题缺少来源卡片"));
        }
        let question = compact(question, 1200, "题目")?;
        if !questions.insert(question.clone()) {
            return Err(AppError::new("INVALID_AI_OUTPUT", "AI 返回了重复题目"));
        }
        let knowledge_points = linked_points(&linked, &request.topics);
        if knowledge_points.is_empty() {
            return Err(AppError::new(
                "INVALID_AI_OUTPUT",
                "AI 生成题没有有效知识点",
            ));
        }
        covered.extend(linked.iter().map(|source| source.id.as_str()));
        drafts.push(to_draft(
            question,
            correct_answer,
            solution,
            &linked,
            knowledge_points,
            request,
        )?);
    }
    if request
        .source_cards
        .iter()
        .any(|source| !covered.contains(source.id.as_str()))
    {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            "AI 未覆盖全部选中的来源错题，请重新生成",
        ));
    }
    Ok(drafts)
}

fn to_draft(
    question: String,
    correct_answer: String,
    solution: String,
    linked: &[&PracticeSourceCard],
    knowledge_points: Vec<KnowledgePoint>,
    request: &PracticeGenerationRequest,
) -> Result<PracticeCardDraft, AppError> {
    Ok(PracticeCardDraft {
        input: CardInput {
            subject: linked[0].subject.clone(),
            question,
            user_answer: String::new(),
            correct_answer: compact(correct_answer, 1200, "正确答案")?,
            supplemental_note: if request.mode == PracticeMode::Recall {
                "错因概念问答".into()
            } else {
                format!(
                    "AI 根据来源错题生成 · 难度：{} · 提示版本：{PRACTICE_PROMPT_VERSION}",
                    request.difficulty.label()
                )
            },
            solution: compact(solution, 2400, "解题步骤")?,
            error_location: String::new(),
            error_reason: String::new(),
            error_type: String::new(),
            knowledge_points,
            assets: Vec::new(),
        },
        source_revisions: linked
            .iter()
            .map(|source| SourceRevision {
                card_id: source.id.clone(),
                revision: source.revision,
            })
            .collect(),
    })
}

fn linked_points(
    sources: &[&PracticeSourceCard],
    topics: &[KnowledgePoint],
) -> Vec<KnowledgePoint> {
    let mut points = Vec::new();
    for point in sources.iter().flat_map(|source| &source.knowledge_points) {
        if topics.iter().any(|topic| topic == point) && !points.contains(point) {
            points.push(point.clone());
        }
    }
    points.truncate(3);
    points
}

fn compact(value: String, limit: usize, label: &str) -> Result<String, AppError> {
    let value = value.trim().to_owned();
    if value.is_empty() || value.chars().count() > limit {
        return Err(AppError::new(
            "INVALID_AI_OUTPUT",
            format!("AI 生成的{label}为空或过长"),
        ));
    }
    Ok(value)
}
