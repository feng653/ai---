use super::CodexProvider;
use crate::domain::CardInput;

#[test]
#[ignore = "requires a logged-in Codex CLI and performs a real model call"]
fn codex_live_agent_create_proposal() {
    let provider = CodexProvider::new();
    let status = provider
        .connect()
        .expect("Codex CLI must be installed and logged in");
    assert_eq!(status.state, "connected");
    let input = CardInput {
        subject: "数学".into(),
        question: String::new(),
        user_answer: String::new(),
        correct_answer: String::new(),
        supplemental_note: String::new(),
        solution: String::new(),
        error_location: String::new(),
        error_reason: String::new(),
        error_type: String::new(),
        knowledge_points: vec![],
        assets: vec![],
    };
    let proposal = provider
        .organize(
            input,
            0,
            vec![],
            Some("创建一张卡片：解不等式 x² > 4".into()),
            |_| {},
        )
        .expect("real Codex run failed");
    let value = serde_json::to_value(proposal).unwrap();
    assert_eq!(value["promptVersion"], "agent-card-v4-latex");
    assert!(value["fields"]["question"]["value"]
        .as_str()
        .is_some_and(|question| question.contains('4')));
    let answer = value["fields"]["correctAnswer"]["value"]
        .as_str()
        .expect("Codex must return a proposed correct answer");
    assert!(answer.contains("-2") && answer.contains('2') && answer.contains('$'));
    assert_eq!(value["fields"]["errorType"]["uncertain"], true);
}
