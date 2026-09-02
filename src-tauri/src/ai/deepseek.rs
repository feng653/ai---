use super::api_client::{image_mime, post_json, MAX_IMAGE_INPUT_BYTES};
use super::settings::ApiProviderConfig;
use crate::error::AppError;
use base64::Engine;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;

const AGENT_SCHEMA: &str = include_str!("../../resources/organize-card.schema.json");

#[derive(Deserialize)]
struct ResponsesOutput {
    output: Vec<OutputItem>,
}

#[derive(Deserialize)]
struct OutputItem {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    content: Vec<ContentPart>,
}

#[derive(Deserialize)]
struct ContentPart {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    text: String,
}

pub async fn agent(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    prompt: &str,
    images: &[PathBuf],
) -> Result<String, AppError> {
    let body = request_body(config, prompt, images)?;
    let response = post_json(client, config, api_key, "responses", &body).await?;
    extract_output_text(&response)
}

fn request_body(
    config: &ApiProviderConfig,
    prompt: &str,
    images: &[PathBuf],
) -> Result<Value, AppError> {
    let schema: Value = serde_json::from_str(AGENT_SCHEMA)
        .map_err(|error| AppError::new("CONFIG_ERROR", format!("Agent Schema 无效：{error}")))?;
    Ok(json!({
        "model": config.model,
        "instructions": "按照用户输入决定直接回答、创建卡片或修改目标卡片，只输出指定 JSON。",
        "input": [{"role": "user", "content": response_content(prompt, images)?}],
        "tools": [{"type": "web_search"}],
        "tool_choice": "auto",
        "text": {"format": {"type": "json_schema", "name": "zhishi_agent_response", "schema": schema}},
        "max_output_tokens": 4096,
        "stream": false
    }))
}

fn response_content(prompt: &str, images: &[PathBuf]) -> Result<Vec<Value>, AppError> {
    let mut content = vec![json!({"type": "input_text", "text": prompt})];
    let mut total = 0_usize;
    for path in images {
        let bytes = std::fs::read(path)?;
        total = total.saturating_add(bytes.len());
        if total > MAX_IMAGE_INPUT_BYTES {
            return Err(AppError::validation(
                "发送给 AI 的图片总大小不能超过 32 MiB",
            ));
        }
        let mime = image_mime(path)?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        content.push(json!({
            "type": "input_image",
            "image_url": format!("data:{mime};base64,{encoded}"),
            "detail": "auto"
        }));
    }
    Ok(content)
}

fn extract_output_text(body: &str) -> Result<String, AppError> {
    let response: ResponsesOutput = serde_json::from_str(body).map_err(|error| {
        AppError::new(
            "INVALID_AI_OUTPUT",
            format!("DeepSeek 响应格式无效：{error}"),
        )
    })?;
    response
        .output
        .into_iter()
        .filter(|item| item.kind == "message")
        .flat_map(|item| item.content)
        .find(|part| part.kind == "output_text" && !part.text.trim().is_empty())
        .map(|part| part.text)
        .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "DeepSeek 未返回可用回答"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_message_and_ignores_search_trace() {
        let body = r#"{"output":[{"type":"web_search_call","content":[]},{"type":"message","content":[{"type":"output_text","text":"{\"action\":\"reply\"}"}]}]}"#;
        assert_eq!(extract_output_text(body).unwrap(), r#"{"action":"reply"}"#);
    }

    #[test]
    fn request_enables_official_web_search_and_schema_output() {
        let config = ApiProviderConfig {
            name: "DeepSeek".into(),
            base_url: "https://api.deepseek.com".into(),
            model: "deepseek-chat".into(),
        };
        let body = request_body(&config, "test", &[]).unwrap();
        assert_eq!(body["tools"][0]["type"], "web_search");
        assert_eq!(body["tool_choice"], "auto");
        assert_eq!(body["text"]["format"]["type"], "json_schema");
    }
}
