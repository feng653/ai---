use super::{AiSource, ProposedField};
use crate::domain::KnowledgePoint;
use std::collections::HashSet;

pub(super) fn sources(values: Vec<AiSource>) -> Vec<AiSource> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter_map(|mut source| {
            source.title = source.title.trim().chars().take(300).collect();
            source.url = source.url.trim().chars().take(2048).collect();
            let valid = reqwest::Url::parse(&source.url)
                .is_ok_and(|url| matches!(url.scheme(), "http" | "https"));
            if !valid || source.title.is_empty() || !seen.insert(source.url.clone()) {
                return None;
            }
            Some(source)
        })
        .take(8)
        .collect()
}

pub(super) fn text(mut field: Option<ProposedField<String>>) -> Option<ProposedField<String>> {
    let value = field.as_mut()?;
    value.value = normalize_math_delimiters(value.value.trim());
    if value.value.is_empty() {
        return None;
    }
    uncertainty(value);
    field
}

fn normalize_math_delimiters(value: &str) -> String {
    value
        .replace("\\[", "\n\n$$\n")
        .replace("\\]", "\n$$\n\n")
        .replace("\\(", "$")
        .replace("\\)", "$")
}

pub(super) fn points(
    mut field: Option<ProposedField<Vec<KnowledgePoint>>>,
) -> Option<ProposedField<Vec<KnowledgePoint>>> {
    let value = field.as_mut()?;
    for point in &mut value.value {
        point.id = None;
        point.subject = point.subject.trim().to_owned();
        point.chapter = point
            .chapter
            .take()
            .map(|item| item.trim().to_owned())
            .filter(|item| !item.is_empty());
        point.name = point.name.trim().to_owned();
    }
    value
        .value
        .retain(|point| !point.subject.is_empty() && !point.name.is_empty());
    value.value.truncate(3);
    if value.value.is_empty() {
        return None;
    }
    uncertainty(value);
    field
}

fn uncertainty<T>(field: &mut ProposedField<T>) {
    field.uncertain_reason = field
        .uncertain_reason
        .take()
        .map(|reason| reason.trim().to_owned())
        .filter(|reason| !reason.is_empty());
    if field.uncertain && field.uncertain_reason.is_none() {
        field.uncertain_reason = Some("AI 标记此项为不确定".into());
    }
    if !field.uncertain {
        field.uncertain_reason = None;
    }
}

pub(super) fn warnings(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    values
        .into_iter()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty() && seen.insert(value.clone()))
        .take(8)
        .collect()
}

pub(super) fn add_warning(warnings: &mut Vec<String>, warning: &str) {
    if !warnings.iter().any(|item| item == warning) {
        warnings.push(warning.into());
    }
}
