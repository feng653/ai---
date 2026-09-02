use super::CodexProvider;
use crate::domain::CardInput;

#[test]
#[ignore = "requires a logged-in Codex CLI and performs a real model call"]
fn codex_live_text_proposal() {
    let provider = CodexProvider::new();
    let status = provider
        .connect()
        .expect("Codex CLI must be installed and logged in");
    assert_eq!(status.state, "connected");
    let input = CardInput {
        subject: "数学".into(),
        question: "解不等式 x² > 4".into(),
        user_answer: "x > 2".into(),
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
        .organize(input, 0, vec![], |_| {})
        .expect("real Codex run failed");
    let value = serde_json::to_value(proposal).unwrap();
    assert_eq!(value["promptVersion"], "organize-card-v3-latex");
    let answer = value["fields"]["correctAnswer"]["value"]
        .as_str()
        .expect("Codex must return a proposed correct answer");
    assert!(answer.contains("-2") && answer.contains('2') && answer.contains('$'));
    assert!(value["fields"]["errorReason"]["value"]
        .as_str()
        .is_some_and(|reason| !reason.trim().is_empty()));
}
