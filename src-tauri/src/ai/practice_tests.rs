use super::practice::{
    build_prompt, PracticeDifficulty, PracticeGenerationRequest, PracticeSourceCard,
};
use super::practice_parse::parse_output;
use crate::domain::KnowledgePoint;

fn request() -> PracticeGenerationRequest {
    let point = KnowledgePoint {
        id: None,
        subject: "数学".into(),
        chapter: Some("函数".into()),
        name: "单调性".into(),
    };
    PracticeGenerationRequest {
        mode: super::practice::PracticeMode::Similar,
        topics: vec![point.clone()],
        additional_requirements: None,
        source_cards: vec![PracticeSourceCard {
            id: "source-1".into(),
            revision: 4,
            subject: "数学".into(),
            question: "判断函数单调性".into(),
            user_answer: "忽略定义域".into(),
            correct_answer: "先求定义域".into(),
            solution: "在定义域内判断".into(),
            error_location: "第一步".into(),
            error_reason: "未检查定义域".into(),
            error_type: "审题错误".into(),
            knowledge_points: vec![point],
        }],
        count: 1,
        difficulty: PracticeDifficulty::Harder,
    }
}

#[test]
fn prompt_contains_difficulty_and_real_error() {
    let mut request = request();
    request.additional_requirements = Some("  加入参数讨论  ".into());
    let prompt = build_prompt(&request).unwrap();
    assert!(prompt.contains("难度要求是“更难”"));
    assert!(prompt.contains("未检查定义域"));
    assert!(prompt.contains("加入参数讨论"));
    assert!(!prompt.contains("  加入参数讨论  "));
}

#[test]
fn output_becomes_a_revision_bound_practice_draft() {
    let drafts = parse_output(
        r#"{"cards":[{"sourceCardIds":["source-1"],"question":"给定参数后判断函数的单调区间。","correctAnswer":"区间为 $(-1,1)$。","solution":"先求定义域，再分析导数符号。"}]}"#,
        &request(),
    )
    .unwrap();
    assert_eq!(drafts[0].source_revisions[0].revision, 4);
    assert!(drafts[0].input.supplemental_note.contains("更难"));
}

#[test]
fn output_must_match_the_requested_count() {
    let mut request = request();
    request.count = 2;
    let error = parse_output(
        r#"{"cards":[{"sourceCardIds":["source-1"],"question":"第一题","correctAnswer":"答案","solution":"解析"}]}"#,
        &request,
    )
    .unwrap_err();
    assert_eq!(error.code, "INVALID_AI_OUTPUT");
}

#[test]
fn rejects_overlong_additional_requirements() {
    let mut request = request();
    request.additional_requirements = Some("a".repeat(501));
    assert_eq!(build_prompt(&request).unwrap_err().code, "VALIDATION_ERROR");
}

#[test]
fn recall_prompt_keeps_concepts_and_requires_error_evidence() {
    let mut input = request();
    input.mode = super::practice::PracticeMode::Recall;
    let prompt = build_prompt(&input).unwrap();
    assert!(prompt.contains("禁止生成计算型仿真试题"));
    assert!(prompt.contains("题目正面不能泄露答案"));
    assert!(!prompt.contains("改变题面、数值或情境"));
    input.source_cards[0].error_reason.clear();
    input.source_cards[0].error_location.clear();
    assert_eq!(build_prompt(&input).unwrap_err().code, "VALIDATION_ERROR");
}

#[test]
fn omitted_mode_preserves_legacy_requests() {
    let mut value = serde_json::to_value(request()).unwrap();
    value.as_object_mut().unwrap().remove("mode");
    let input: PracticeGenerationRequest = serde_json::from_value(value).unwrap();
    assert_eq!(input.mode, super::practice::PracticeMode::Similar);
}
