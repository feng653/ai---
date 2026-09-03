use serde_json::{Map, Value};

pub(super) fn normalized_value(text: &str) -> Result<Value, serde_json::Error> {
    let mut value = serde_json::from_str(strip_json_fence(text))?;
    normalize_step(&mut value);
    Ok(value)
}

fn strip_json_fence(text: &str) -> &str {
    let trimmed = text.trim();
    let Some(rest) = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
    else {
        return trimmed;
    };
    rest.strip_suffix("```").unwrap_or(rest).trim()
}

fn normalize_step(value: &mut Value) {
    let Some(root) = value.as_object_mut() else {
        return;
    };
    rename(root, "decision_summary", "decisionSummary");
    rename(root, "tool_call", "toolCall");
    if !root.contains_key("toolCall") && root.get("action").and_then(Value::as_str) == Some("tool")
    {
        let mut call = Map::new();
        for key in [
            "name",
            "tool",
            "toolName",
            "query",
            "cardId",
            "card_id",
            "expectedRevision",
            "expected_revision",
            "input",
            "changes",
            "arguments",
            "function",
        ] {
            if let Some(item) = root.remove(key) {
                call.insert(key.into(), item);
            }
        }
        if !call.is_empty() {
            root.insert("toolCall".into(), Value::Object(call));
        }
    }
    match root.get("action").and_then(Value::as_str) {
        Some("tool") => {
            root.entry("message").or_insert(Value::Null);
        }
        Some("final") => {
            root.entry("toolCall").or_insert(Value::Null);
        }
        _ => {}
    }
    if let Some(call) = root.get_mut("toolCall") {
        normalize_tool_call(call);
    }
}

fn normalize_tool_call(value: &mut Value) {
    let Some(call) = value.as_object_mut() else {
        return;
    };
    rename(call, "toolName", "name");
    rename(call, "tool", "name");
    if let Some(function) = call
        .remove("function")
        .and_then(|item| item.as_object().cloned())
    {
        if !call.contains_key("name") {
            if let Some(name) = function.get("name") {
                call.insert("name".into(), name.clone());
            }
        }
        if !call.contains_key("arguments") {
            if let Some(args) = function.get("arguments") {
                call.insert("arguments".into(), args.clone());
            }
        }
    }
    if let Some(arguments) = call.remove("arguments") {
        let arguments = match arguments {
            Value::String(text) => serde_json::from_str(&text).unwrap_or(Value::Null),
            other => other,
        };
        if let Value::Object(arguments) = arguments {
            for (key, item) in arguments {
                call.entry(key).or_insert(item);
            }
        }
    }
    rename(call, "card_id", "cardId");
    rename(call, "expected_revision", "expectedRevision");
    for key in ["query", "cardId", "expectedRevision", "input", "changes"] {
        call.entry(key).or_insert(Value::Null);
    }
    if let Some(input) = call.get_mut("input") {
        normalize_card(input, true);
    }
    if let Some(changes) = call.get_mut("changes") {
        normalize_card(changes, false);
    }
}

fn normalize_card(value: &mut Value, complete: bool) {
    let Some(card) = value.as_object_mut() else {
        return;
    };
    for (old, new) in [
        ("user_answer", "userAnswer"),
        ("correct_answer", "correctAnswer"),
        ("supplemental_note", "supplementalNote"),
        ("error_location", "errorLocation"),
        ("error_reason", "errorReason"),
        ("error_type", "errorType"),
        ("knowledge_points", "knowledgePoints"),
    ] {
        rename(card, old, new);
    }
    if complete {
        for key in [
            "subject",
            "question",
            "userAnswer",
            "correctAnswer",
            "supplementalNote",
            "solution",
            "errorLocation",
            "errorReason",
            "errorType",
        ] {
            card.entry(key)
                .or_insert_with(|| Value::String(String::new()));
        }
        card.entry("knowledgePoints")
            .or_insert_with(|| Value::Array(Vec::new()));
        card.insert("assets".into(), Value::Array(Vec::new()));
    }
    if let Some(points) = card
        .get_mut("knowledgePoints")
        .and_then(Value::as_array_mut)
    {
        points.retain(|point| {
            point
                .get("subject")
                .and_then(Value::as_str)
                .is_some_and(|s| !s.is_empty())
                && point
                    .get("name")
                    .and_then(Value::as_str)
                    .is_some_and(|s| !s.is_empty())
        });
    }
}

fn rename(object: &mut Map<String, Value>, old: &str, new: &str) {
    if !object.contains_key(new) {
        if let Some(value) = object.remove(old) {
            object.insert(new.into(), value);
        }
    }
}
