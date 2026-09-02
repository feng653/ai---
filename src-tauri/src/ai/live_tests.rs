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
            None,
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

#[test]
#[ignore = "requires a logged-in Codex CLI and performs a real model call"]
fn codex_live_agent_follow_up_proposal() {
    let provider = CodexProvider::new();
    let input = CardInput {
        subject: "数学".into(),
        question: "解不等式 $x^2>4$。".into(),
        user_answer: String::new(),
        correct_answer: "$x<-2$ 或 $x>2$".into(),
        supplemental_note: String::new(),
        solution: "先移项，再根据平方的性质分别讨论正数和负数两个分支。".into(),
        error_location: String::new(),
        error_reason: String::new(),
        error_type: String::new(),
        knowledge_points: vec![],
        assets: vec![],
    };
    let proposal = provider
        .organize(
            input,
            1,
            vec![],
            Some("把刚才的解题过程压缩成一句话".into()),
            Some(vec!["用户：先生成完整解题过程".into()]),
            |_| {},
        )
        .expect("real Codex follow-up failed");
    let value = serde_json::to_value(proposal).unwrap();
    assert!(value["fields"]["solution"]["value"]
        .as_str()
        .is_some_and(|solution| !solution.trim().is_empty()));
}
