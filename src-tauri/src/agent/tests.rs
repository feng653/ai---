use super::protocol::{CardChanges, ModelToolCall};
use super::state::{AgentRuntimeState, PendingApproval};
use super::tools::{execute, ToolOutcome};
use super::{resolve_approval, tool_manifests};
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
        })
        .unwrap();

    let result = resolve_approval(&storage, &runtime, &view.approval_id, true).unwrap();
    assert_eq!(result.card.unwrap().question, "证明函数单调性");
    assert_eq!(
        resolve_approval(&storage, &runtime, &view.approval_id, true)
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
