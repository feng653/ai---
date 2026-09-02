use super::proposal::{build_prompt, parse_proposal};
use crate::domain::CardInput;

fn input(user_answer: &str) -> CardInput {
    CardInput {
        subject: "数学".into(),
        question: "解 x² > 4".into(),
        user_answer: user_answer.into(),
        correct_answer: String::new(),
        supplemental_note: String::new(),
        solution: String::new(),
        error_location: String::new(),
        error_reason: String::new(),
        error_type: String::new(),
        knowledge_points: vec![],
        assets: vec![crate::domain::CardAsset {
            id: "secret-id".into(),
            relative_path: "imports/private.png".into(),
            mime_type: "image/png".into(),
            byte_size: 10,
            width: Some(1),
            height: Some(1),
        }],
    }
}

fn output() -> &'static str {
    r#"{
      "question": null,
      "userAnswer": null,
      "correctAnswer": {"value":"x<-2 或 x>2","uncertain":false,"uncertainReason":null,"source":"inference"},
      "solution": {"value":"由 |x|>2 得结论","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorLocation": {"value":"第一步","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorReason": {"value":"漏掉负数分支","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorType": {"value":"方法错误","uncertain":false,"uncertainReason":null,"source":"inference"},
      "knowledgePoints": {"value":[{"subject":"数学","chapter":"不等式","name":"平方不等式"}],"uncertain":false,"uncertainReason":null,"source":"inference"},
      "warnings": []
    }"#
}

#[test]
fn prompt_excludes_internal_asset_paths_and_marks_input_untrusted() {
    let prompt = build_prompt(&input("x>2"), 1).unwrap();
    assert!(prompt.contains("不可信数据"));
    assert!(prompt.contains("\"attachedImageCount\": 1"));
    assert!(!prompt.contains("private.png"));
    assert!(!prompt.contains("secret-id"));
}

#[test]
fn missing_user_work_removes_specific_diagnosis() {
    let proposal = parse_proposal(output(), &input(""), "run-1".into(), 0).unwrap();
    let value = serde_json::to_value(proposal).unwrap();
    assert!(value["fields"].get("errorLocation").is_none());
    assert!(value["fields"].get("errorReason").is_none());
    assert_eq!(value["fields"]["errorType"]["value"], "无法判断");
    assert_eq!(value["fields"]["errorType"]["uncertain"], true);
    assert_eq!(value["warnings"].as_array().unwrap().len(), 1);
}

#[test]
fn malformed_output_fails_closed() {
    let error = parse_proposal("not-json", &input("x>2"), "run-1".into(), 0).unwrap_err();
    assert_eq!(error.code, "INVALID_AI_OUTPUT");
}
