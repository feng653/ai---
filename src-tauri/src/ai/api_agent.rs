use super::api_client::{extract_content, image_mime, post_json, MAX_IMAGE_INPUT_BYTES};
use super::settings::ApiProviderConfig;
use crate::error::AppError;
use base64::Engine;
use reqwest::Client;
use serde_json::{json, Value};
use std::path::PathBuf;

const AGENT_STEP_SCHEMA: &str = include_str!("../../resources/agent-step.schema.json");

pub async fn agent_step(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    prompt: &str,
    reasoning_effort: &str,
    images: &[PathBuf],
) -> Result<String, AppError> {
    if config.base_url.contains("api.openai.com") {
        return openai_step(client, config, api_key, prompt, reasoning_effort, images).await;
    }
    let body = json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": "你是知拾 Agent 决策模型，只输出符合要求的 JSON。"},
            {"role": "user", "content": chat_content(prompt, images)?}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 8192,
        "stream": false
    });
    let text = post_json(client, config, api_key, "chat/completions", &body).await?;
    extract_content(&text)
}

async fn openai_step(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    prompt: &str,
    reasoning_effort: &str,
    images: &[PathBuf],
) -> Result<String, AppError> {
    let schema: Value = serde_json::from_str(AGENT_STEP_SCHEMA)
        .map_err(|error| AppError::new("CONFIG_ERROR", format!("Agent Schema 无效：{error}")))?;
    let body = json!({
        "model": config.model,
        "instructions": "作为知拾 Agent 决策模型，一次直接回答或请求一个应用工具。",
        "input": [{"role": "user", "content": responses_content(prompt, images)?}],
        "reasoning": {"effort": reasoning_effort},
        "text": {"format": {"type": "json_schema", "name": "zhishi_agent_step", "strict": true, "schema": schema}},
        "max_output_tokens": 8192,
        "store": false
    });
    let response = post_json(client, config, api_key, "responses", &body).await?;
    extract_responses_text(&response)
}

fn chat_content(prompt: &str, images: &[PathBuf]) -> Result<Value, AppError> {
    if images.is_empty() {
        return Ok(Value::String(prompt.into()));
    }
    let mut blocks = vec![json!({"type": "text", "text": prompt})];
    for (mime, encoded) in encoded_images(images)? {
        blocks.push(json!({"type": "image_url", "image_url": {"url": format!("data:{mime};base64,{encoded}")}}));
    }
    Ok(Value::Array(blocks))
}

fn responses_content(prompt: &str, images: &[PathBuf]) -> Result<Vec<Value>, AppError> {
    let mut blocks = vec![json!({"type": "input_text", "text": prompt})];
    for (mime, encoded) in encoded_images(images)? {
        blocks.push(json!({"type": "input_image", "image_url": format!("data:{mime};base64,{encoded}"), "detail": "auto"}));
    }
    Ok(blocks)
}

fn encoded_images(images: &[PathBuf]) -> Result<Vec<(&'static str, String)>, AppError> {
    let mut total = 0_usize;
    images
        .iter()
        .map(|path| {
            let bytes = std::fs::read(path)?;
            total = total.saturating_add(bytes.len());
            if total > MAX_IMAGE_INPUT_BYTES {
                return Err(AppError::validation(
                    "发送给 AI 的图片总大小不能超过 32 MiB",
                ));
            }
            Ok((
                image_mime(path)?,
                base64::engine::general_purpose::STANDARD.encode(bytes),
            ))
        })
        .collect()
}

fn extract_responses_text(body: &str) -> Result<String, AppError> {
    let value: Value = serde_json::from_str(body).map_err(|error| {
        AppError::new(
            "INVALID_AI_OUTPUT",
            format!("Responses API 返回无效：{error}"),
        )
    })?;
    value["output"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|item| item["type"] == "message")
        .flat_map(|item| item["content"].as_array().into_iter().flatten())
        .find(|part| part["type"] == "output_text")
        .and_then(|part| part["text"].as_str())
        .filter(|text| !text.trim().is_empty())
        .map(str::to_owned)
        .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "Responses API 未返回 Agent 结果"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_structured_responses_output() {
        let body = r#"{"output":[{"type":"reasoning"},{"type":"message","content":[{"type":"output_text","text":"{\"action\":\"final\"}"}]}]}"#;
        assert_eq!(
            extract_responses_text(body).unwrap(),
            r#"{"action":"final"}"#
        );
    }
}
