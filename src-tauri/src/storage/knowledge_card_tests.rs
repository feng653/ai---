use super::Storage;
use crate::domain::{
    CardInput, GeneratedKnowledgeCard, KnowledgeCardSaveInput, KnowledgeCardStatus, KnowledgePoint,
    SourceRevision,
};

fn source_input() -> CardInput {
    CardInput {
        subject: "数学".into(),
        question: "解方程".into(),
        user_answer: String::new(),
        correct_answer: "x=1".into(),
        supplemental_note: String::new(),
        solution: "移项求解".into(),
        error_location: String::new(),
        error_reason: String::new(),
        error_type: String::new(),
        knowledge_points: vec![KnowledgePoint {
            id: None,
            subject: "数学".into(),
            chapter: Some("代数".into()),
            name: "方程".into(),
        }],
        assets: Vec::new(),
    }
}

#[test]
fn persists_promotes_and_deletes_a_knowledge_card_draft() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let source = storage
        .save_card(source_input(), None, None, false)
        .unwrap();
    let mut input = KnowledgeCardSaveInput {
        key: "数学/代数/方程".into(),
        subject: "数学".into(),
        chapter: Some("代数".into()),
        name: "方程".into(),
        status: KnowledgeCardStatus::Draft,
        content: GeneratedKnowledgeCard {
            run_id: "run-1".into(),
            prompt_version: "knowledge-v1".into(),
            core_method: "先移项，再求解。".into(),
            mistake_reminder: "注意符号。".into(),
            source_revisions: vec![SourceRevision {
                card_id: source.id,
                revision: source.revision,
            }],
            warnings: Vec::new(),
        },
    };
    let draft = storage.save_knowledge_card(input.clone()).unwrap();
    assert_eq!(draft.status, KnowledgeCardStatus::Draft);
    drop(storage);
    let storage = Storage::open(directory.path()).unwrap();
    let restored = storage.list_knowledge_cards().unwrap();
    assert_eq!(restored.len(), 1);
    assert_eq!(restored[0].content.run_id, "run-1");

    input.status = KnowledgeCardStatus::Saved;
    let saved = storage.save_knowledge_card(input).unwrap();
    assert_eq!(saved.status, KnowledgeCardStatus::Saved);
    storage.delete_knowledge_card(&saved.key).unwrap();
    assert!(storage.list_knowledge_cards().unwrap().is_empty());
}

#[test]
fn rejects_a_draft_when_its_source_revision_is_stale() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let source = storage
        .save_card(source_input(), None, None, false)
        .unwrap();
    let input = KnowledgeCardSaveInput {
        key: "数学/代数/方程".into(),
        subject: "数学".into(),
        chapter: Some("代数".into()),
        name: "方程".into(),
        status: KnowledgeCardStatus::Draft,
        content: GeneratedKnowledgeCard {
            run_id: "stale-run".into(),
            prompt_version: "knowledge-v1".into(),
            core_method: "先移项，再求解。".into(),
            mistake_reminder: "注意符号。".into(),
            source_revisions: vec![SourceRevision {
                card_id: source.id.clone(),
                revision: source.revision,
            }],
            warnings: Vec::new(),
        },
    };
    storage
        .save_card(
            source_input(),
            Some(source.id),
            Some(source.revision),
            false,
        )
        .unwrap();

    let error = storage.save_knowledge_card(input).unwrap_err();
    assert_eq!(error.code, "REVISION_CONFLICT");
    assert!(storage.list_knowledge_cards().unwrap().is_empty());
}
