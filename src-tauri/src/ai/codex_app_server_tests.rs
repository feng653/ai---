use super::codex::CodexProvider;
use super::codex_app_server::{thread_start_request, turn_start_request};
use super::codex_app_server_process::extract_agent_text;
use serde_json::json;
use std::path::{Path, PathBuf};

#[test]
fn starts_an_ephemeral_read_only_thread() {
    let request = thread_start_request(Path::new("C:\\temp\\zhishi-agent"));
    assert_eq!(request["method"], "thread/start");
    assert_eq!(request["params"]["approvalPolicy"], "never");
    assert_eq!(request["params"]["sandbox"], "read-only");
    assert_eq!(request["params"]["ephemeral"], true);
}

#[test]
fn constrains_each_turn_and_passes_staged_images() {
    let work_dir = Path::new("C:\\temp\\zhishi-agent");
    let images = vec![PathBuf::from("C:\\temp\\zhishi-agent\\input-1.png")];
    let request = turn_start_request("thread-1", work_dir, &images, "prompt", "medium").unwrap();
    assert_eq!(request["params"]["sandboxPolicy"]["type"], "readOnly");
    assert_eq!(request["params"]["sandboxPolicy"]["networkAccess"], false);
    assert_eq!(request["params"]["input"][1]["type"], "localImage");
    assert_eq!(request["params"]["outputSchema"]["required"][0], "action");
}

#[test]
fn extracts_completed_agent_message() {
    let message = json!({"method":"item/completed","params":{"item":{
        "type":"agentMessage","text":"{\"action\":\"final\"}","phase":"final_answer"
    }}});
    assert_eq!(
        extract_agent_text(&message).as_deref(),
        Some("{\"action\":\"final\"}")
    );
}

#[test]
#[ignore = "requires ZHISHI_LIVE_DATA_DIR and performs a real Codex model call"]
fn live_app_server_returns_schema_constrained_json() {
    let data_dir = std::env::var_os("ZHISHI_LIVE_DATA_DIR")
        .map(PathBuf::from)
        .expect("set ZHISHI_LIVE_DATA_DIR to the app data directory");
    let output = CodexProvider::new(&data_dir)
        .agent_step("直接回答测试成功，不调用工具。".into(), "low", Vec::new())
        .expect("real Codex App Server turn failed");
    let value: serde_json::Value = serde_json::from_str(&output).unwrap();
    assert_eq!(value["action"], "final");
    assert!(value["message"]
        .as_str()
        .is_some_and(|text| !text.is_empty()));
    assert!(value["decisionSummary"].as_str().is_some());
    assert!(value["toolCall"].is_null());
}
