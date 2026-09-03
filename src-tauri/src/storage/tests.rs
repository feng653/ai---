use super::Storage;
use crate::domain::{CardFilter, CardInput, PracticeCardDraft, SourceRevision};
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;

fn input() -> CardInput {
    CardInput {
        subject: "数学".into(),
        question: "解 x² > 4".into(),
        user_answer: "x > 2".into(),
        correct_answer: "x > 2 或 x < -2".into(),
        supplemental_note: String::new(),
        solution: "分正负两支".into(),
        error_location: "遗漏负数分支".into(),
        error_reason: "平方开方时只取正数".into(),
        error_type: "方法错误".into(),
        knowledge_points: vec![crate::domain::KnowledgePoint {
            id: None,
            subject: "数学".into(),
            chapter: Some("不等式".into()),
            name: "平方不等式".into(),
        }],
        assets: vec![],
    }
}

#[test]
fn persists_searches_and_checks_revisions() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let saved = storage.save_card(input(), None, None).unwrap();
    assert_eq!(saved.revision, 1);
    assert_eq!(storage.get_card(&saved.id).unwrap().question, "解 x² > 4");
    let matches = storage
        .list_cards(CardFilter {
            query: Some("平方开方".into()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(matches.len(), 1);
    let error = storage
        .save_card(input(), Some(saved.id), Some(0))
        .unwrap_err();
    assert_eq!(error.code, "REVISION_CONFLICT");
}

#[test]
fn practice_cards_preserve_source_revisions_and_filter_by_kind() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let source = storage.save_card(input(), None, None).unwrap();
    let mut practice = input();
    practice.question = "同知识点变式题".into();
    practice.user_answer.clear();
    let saved = storage
        .save_practice_cards(vec![PracticeCardDraft {
            input: practice,
            source_revisions: vec![SourceRevision {
                card_id: source.id.clone(),
                revision: source.revision,
            }],
        }])
        .unwrap();
    assert_eq!(saved[0].kind, "practice");
    assert_eq!(saved[0].source_revisions[0].card_id, source.id);
    assert_eq!(
        storage
            .list_cards(CardFilter {
                kind: Some("practice".into()),
                ..Default::default()
            })
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        storage
            .list_cards(CardFilter {
                kind: Some("mistake".into()),
                ..Default::default()
            })
            .unwrap()
            .len(),
        1
    );
}

#[test]
fn practice_generation_refuses_a_stale_source_revision() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let source = storage.save_card(input(), None, None).unwrap();
    let error = storage
        .save_practice_cards(vec![PracticeCardDraft {
            input: input(),
            source_revisions: vec![SourceRevision {
                card_id: source.id,
                revision: 99,
            }],
        }])
        .unwrap_err();
    assert_eq!(error.code, "REVISION_CONFLICT");
}

#[test]
fn filters_cards_at_each_knowledge_level() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    storage.save_card(input(), None, None).unwrap();
    let mut physics = input();
    physics.subject = "物理".into();
    physics.question = "求物体加速度".into();
    physics.knowledge_points[0].subject = "物理".into();
    physics.knowledge_points[0].chapter = Some("力学".into());
    physics.knowledge_points[0].name = "牛顿第二定律".into();
    storage.save_card(physics, None, None).unwrap();
    let mut uncategorized = input();
    uncategorized.question = "综合题".into();
    uncategorized.knowledge_points[0].chapter = None;
    uncategorized.knowledge_points[0].name = "综合应用".into();
    storage.save_card(uncategorized, None, None).unwrap();

    let count = |filter| storage.list_cards(filter).unwrap().len();
    assert_eq!(
        count(CardFilter {
            knowledge_subject: Some("物理".into()),
            ..Default::default()
        }),
        1
    );
    assert_eq!(
        count(CardFilter {
            knowledge_chapter: Some("不等式".into()),
            ..Default::default()
        }),
        1
    );
    assert_eq!(
        count(CardFilter {
            knowledge_subject: Some("物理".into()),
            knowledge_chapter: Some("力学".into()),
            knowledge_point: Some("牛顿第二定律".into()),
            ..Default::default()
        }),
        1
    );
    assert_eq!(
        count(CardFilter {
            knowledge_subject: Some("数学".into()),
            knowledge_point: Some("牛顿第二定律".into()),
            ..Default::default()
        }),
        0
    );
    assert_eq!(
        count(CardFilter {
            knowledge_subject: Some("数学".into()),
            knowledge_chapter: Some("__uncategorized__".into()),
            ..Default::default()
        }),
        1
    );
}

#[test]
fn imports_reads_and_deletes_an_image_with_its_card() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::new_rgb8(1, 1)
        .write_to(&mut bytes, ImageFormat::Png)
        .unwrap();
    let bytes = bytes.into_inner();
    let asset = storage
        .import_asset("question.png", "image/png", &bytes)
        .unwrap();
    assert_eq!(storage.read_asset(&asset.id).unwrap(), bytes);
    let mut card_input = input();
    card_input.question.clear();
    card_input.assets = vec![asset.clone()];
    let card = storage.save_card(card_input, None, None).unwrap();
    storage.delete_card(&card.id).unwrap();
    assert_eq!(storage.read_asset(&asset.id).unwrap_err().code, "NOT_FOUND");
}
