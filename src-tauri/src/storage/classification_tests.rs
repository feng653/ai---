use super::Storage;
use crate::domain::{CardFilter, CardInput, KnowledgePoint};
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;

#[test]
fn image_only_card_survives_restart_and_leaves_pending_after_classification() {
    let directory = tempfile::tempdir().unwrap();
    let storage = Storage::open(directory.path()).unwrap();
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::new_rgb8(1, 1)
        .write_to(&mut bytes, ImageFormat::Png)
        .unwrap();
    let asset = storage
        .import_asset("question.png", "image/png", &bytes.into_inner())
        .unwrap();
    let input: CardInput = serde_json::from_value(serde_json::json!({
        "subject": "数学", "question": "", "userAnswer": "", "correctAnswer": "",
        "supplementalNote": "", "solution": "", "errorLocation": "", "errorReason": "",
        "errorType": "", "knowledgePoints": [], "assets": [asset]
    }))
    .unwrap();
    let saved = storage.save_card(input, None, None, false).unwrap();
    drop(storage);
    let storage = Storage::open(directory.path()).unwrap();
    let pending = || CardFilter {
        unclassified: Some(true),
        kind: Some("mistake".into()),
        ..Default::default()
    };
    let cards = storage.list_cards(pending()).unwrap();
    assert_eq!(cards.len(), 1);
    assert_eq!(cards[0].id, saved.id);
    assert!(!storage.read_asset(&asset.id).unwrap().is_empty());
    assert!(storage
        .list_cards(CardFilter {
            query: Some("不存在".into()),
            ..pending()
        })
        .unwrap()
        .is_empty());
    let mut input: CardInput =
        serde_json::from_value(serde_json::to_value(&cards[0]).unwrap()).unwrap();
    input.knowledge_points = vec![KnowledgePoint {
        id: None,
        subject: "数学".into(),
        chapter: None,
        name: "综合".into(),
    }];
    storage
        .save_card(input, Some(saved.id.clone()), Some(saved.revision), false)
        .unwrap();
    assert!(storage.list_cards(pending()).unwrap().is_empty());
    let matches = storage
        .list_cards(CardFilter {
            knowledge_subject: Some("数学".into()),
            knowledge_chapter: Some("__uncategorized__".into()),
            ..Default::default()
        })
        .unwrap();
    assert_eq!(matches[0].id, saved.id);
}
