use super::approval::execute_approval;
use super::protocol::{
    CardChanges, InteractionMode, ModelAction, ModelStep, ModelToolCall, ReasoningEffort,
    StartTurnRequest,
};
use super::runtime_support::repair_referenced_card_call;
use super::state::{AgentRuntimeState, PendingApproval, RunContinuation};
use super::tool_manifests;
use super::tools::{execute, ToolOutcome};
use crate::domain::CardInput;
use crate::storage::Storage;

fn input(question: &str) -> CardInput {
    CardInput {
        subject: "数学".into(),
        question: question.into(),
        user_answer: String::new(),
        correct_answer: String::new(),
        supplemental_note: String::new(),
        solution: "分步骤推导".into(),
        error_location: String::new(),
        error_reason: String::new(),
        error_type: String::new(),
        knowledge_points: Vec::new(),
        assets: Vec::new(),
    }
}

fn call(name: &str) -> ModelToolCall {
    ModelToolCall {
        name: name.into(),
        query: None,
        card_id: None,
        expected_revision: None,
        input: None,
        changes: None,
    }
}

#[test]
fn create_is_deferred_until_the_single_use_approval_is_accepted() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let runtime = AgentRuntimeState::default();
    let mut request = call("cards.create");
    request.input = Some(input("证明函数单调性"));
    let (view, action) = match execute(&storage, "call-1", request).unwrap() {
        ToolOutcome::Approval { view, action } => (view, action),
        ToolOutcome::Observation(_) => panic!("write tool executed without approval"),
    };
    assert!(storage.list_cards(Default::default()).unwrap().is_empty());
    runtime
        .insert(PendingApproval {
            run_id: "run-1".into(),
            view: view.clone(),
            action: *action,
            assets: Vec::new(),
            continuation: Some(RunContinuation {
                request: StartTurnRequest {
                    run_id: "run-1".into(),
                    message: "拆成三张".into(),
                    history: Vec::new(),
                    references: vec!["card-1".into()],
                    assets: Vec::new(),
                    mode: InteractionMode::Auto,
                    reasoning_effort: ReasoningEffort::Medium,
                },
                observations: vec!["cards.get => original".into()],
                next_step: 2,
                owns_assets: true,
            }),
        })
        .unwrap();

    let result = execute_approval(&storage, &runtime, &view.approval_id, true).unwrap();
    let continuation = result.continuation.unwrap();
    assert_eq!(continuation.next_step, 2);
    assert_eq!(continuation.observations, ["cards.get => original"]);
    assert_eq!(result.result.card.unwrap().question, "证明函数单调性");
    assert_eq!(
        execute_approval(&storage, &runtime, &view.approval_id, true)
            .unwrap_err()
            .code,
        "APPROVAL_NOT_FOUND"
    );
}

#[test]
fn update_refuses_a_stale_revision_before_requesting_approval() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let saved = storage.save_card(input("原题"), None, None, false).unwrap();
    let mut request = call("cards.update");
    request.card_id = Some(saved.id);
    request.expected_revision = Some(0);
    request.changes = Some(CardChanges {
        solution: Some("新解法".into()),
        ..Default::default()
    });
    assert_eq!(
        execute(&storage, "call-2", request).err().unwrap().code,
        "REVISION_CONFLICT"
    );
}

#[test]
fn public_manifest_marks_only_writes_as_approval_required() {
    let tools = tool_manifests();
    assert_eq!(tools.len(), 6);
    assert!(tools
        .iter()
        .filter(|tool| tool.side_effect)
        .all(|tool| tool.approval_required));
    assert!(tools
        .iter()
        .filter(|tool| !tool.side_effect)
        .all(|tool| !tool.approval_required));
}

#[test]
fn fills_single_explicit_reference_for_cards_get() {
    let mut step = ModelStep {
        action: ModelAction::Tool,
        message: None,
        decision_summary: "读取引用卡片".into(),
        tool_call: Some(ModelToolCall {
            name: "cards.get".into(),
            query: None,
            card_id: None,
            expected_revision: None,
            input: None,
            changes: None,
        }),
    };
    let request = StartTurnRequest {
        run_id: "run-1".into(),
        message: "拆成三张".into(),
        history: Vec::new(),
        references: vec!["card-1".into()],
        assets: Vec::new(),
        mode: InteractionMode::Auto,
        reasoning_effort: ReasoningEffort::Medium,
    };
    repair_referenced_card_call(&mut step, &request);
    assert_eq!(step.tool_call.unwrap().card_id.as_deref(), Some("card-1"));
}

#[test]
fn search_lists_existing_cards_and_distinguishes_no_match_from_empty_library() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    for index in 0..10 {
        storage.save_card(input(&format!("积分题 {index}")), None, None, false).unwrap();
    }
    for query in [None, Some(String::new()), Some("不存在的关键词".into())] {
        let mut request = call("cards.search");
        request.query = query.clone();
        let ToolOutcome::Observation(result) = execute(&storage, "search", request).unwrap() else {
            panic!("search must not require approval");
        };
        let result: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(result["libraryCount"], 10);
        let unmatched = query.as_deref() == Some("不存在的关键词");
        assert_eq!(result["count"], if unmatched { 0 } else { 10 });
        assert_eq!(result["returnedCount"], if unmatched { 0 } else { 8 });
        assert_eq!(result["truncated"], !unmatched);
    }
}
