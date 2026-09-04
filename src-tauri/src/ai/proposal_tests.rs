use super::prompt::build_agent_prompt;
use super::proposal::{build_prompt, parse_agent_response, parse_proposal};
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
      "correctAnswer": {"value":"\\(x<-2\\) 或 $x>2$","uncertain":false,"uncertainReason":null,"source":"inference"},
      "solution": {"value":"由 \\[|x|>2\\] 得结论","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorLocation": {"value":"第一步","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorReason": {"value":"漏掉负数分支","uncertain":false,"uncertainReason":null,"source":"inference"},
      "errorType": {"value":"方法错误","uncertain":false,"uncertainReason":null,"source":"inference"},
      "knowledgePoints": {"value":[{"subject":"数学","chapter":"不等式","name":"平方不等式"}],"uncertain":false,"uncertainReason":null,"source":"inference"},
      "warnings": []
    }"#
}

#[test]
fn prompt_excludes_internal_asset_paths_and_marks_input_untrusted() {
    let history = vec!["用户：先给出完整解法".into()];
    let prompt = build_prompt(&input("x>2"), 1, Some("再简短一点"), &history).unwrap();
    assert!(prompt.contains("不可信数据"));
    assert!(prompt.contains("\"attachedImageCount\": 1"));
    assert!(!prompt.contains("private.png"));
    assert!(!prompt.contains("secret-id"));
    assert!(prompt.contains("行内公式写成 $...$"));
    assert!(prompt.contains("再简短一点"));
    assert!(prompt.contains("先给出完整解法"));
    assert!(prompt.contains("其余字段必须返回 null"));
}

#[test]
fn prompt_rejects_overlong_additional_requirements() {
    let requirements = "a".repeat(501);
    let error = build_prompt(&input("x>2"), 0, Some(&requirements), &[]).unwrap_err();
    assert_eq!(error.code, "VALIDATION_ERROR");
}

#[test]
fn agent_prompt_exposes_all_actions_and_target_boundary() {
    let prompt = build_agent_prompt(&input(""), 0, "解释二次函数", &[], false, true).unwrap();
    assert!(prompt.contains("reply"));
    assert!(prompt.contains("create_card"));
    assert!(prompt.contains("update_card"));
    assert!(prompt.contains("targetProvided=false"));
    assert!(prompt.contains("webSearchEnabled=true"));
    assert!(prompt.contains("用户要求多道题时必须按数量逐题返回"));
    assert!(prompt.contains("一次最多 10 张"));
}

#[test]
fn normalizes_supported_latex_delimiters() {
    let proposal = parse_proposal(output(), &input("x>2"), "run-1".into(), 0).unwrap();
    let value = serde_json::to_value(proposal).unwrap();
    assert_eq!(value["fields"]["correctAnswer"]["value"], "$x<-2$ 或 $x>2$");
    assert_eq!(
        value["fields"]["solution"]["value"],
        "由 \n\n$$\n|x|>2\n$$\n\n 得结论"
    );
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

#[test]
fn agent_can_return_a_direct_answer_with_safe_sources() {
    let json = r#"{
      "action":"reply",
      "message":"直接回答",
      "sources":[
        {"title":"官方资料","url":"https://example.com/docs"},
        {"title":"不安全链接","url":"javascript:alert(1)"}
      ],
      "warnings":[]
    }"#;
    let proposal = parse_agent_response(json, &input(""), "run-1".into(), 0, false, true).unwrap();
    let value = serde_json::to_value(proposal).unwrap();
    assert_eq!(value["action"], "reply");
    assert_eq!(value["message"], "直接回答");
    assert_eq!(value["sources"].as_array().unwrap().len(), 1);
    assert_eq!(value["fields"], serde_json::json!({}));
    assert_eq!(value["warnings"], serde_json::json!([]));

    let offline = parse_agent_response(json, &input(""), "run-2".into(), 0, false, false).unwrap();
    assert!(serde_json::to_value(offline).unwrap()["sources"]
        .as_array()
        .unwrap()
        .is_empty());
}

#[test]
fn agent_cannot_modify_without_a_target_card() {
    let json = r#"{"action":"update_card","message":"修改提案","warnings":[]}"#;
    let error =
        parse_agent_response(json, &input("x>2"), "run-1".into(), 0, false, false).unwrap_err();
    assert_eq!(error.code, "INVALID_AI_OUTPUT");
}

#[test]
fn agent_preserves_each_created_card_in_a_multi_card_response() {
    let json = r#"{
      "action":"create_card","message":"已生成三道示例题","warnings":[],
      "cards":[
        {"question":{"value":"例题一","uncertain":false,"uncertainReason":null,"source":"inference"},"warnings":[]},
        {"question":{"value":"例题二","uncertain":false,"uncertainReason":null,"source":"inference"},"warnings":[]},
        {"question":{"value":"例题三","uncertain":false,"uncertainReason":null,"source":"inference"},"warnings":[]}
      ]
    }"#;
    let proposal =
        parse_agent_response(json, &input(""), "run-many".into(), 0, false, false).unwrap();
    let value = serde_json::to_value(proposal).unwrap();
    let cards = value["cards"].as_array().unwrap();
    assert_eq!(cards.len(), 3);
    assert_eq!(cards[0]["fields"]["question"]["value"], "例题一");
    assert_eq!(cards[1]["fields"]["question"]["value"], "例题二");
    assert_eq!(cards[2]["fields"]["question"]["value"], "例题三");
}
