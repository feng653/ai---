use super::api_client::{extract_content, post_json};
use super::settings::ApiProviderConfig;
use crate::error::AppError;
use reqwest::Client;
use serde_json::{json, Value};

pub async fn generate(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    prompt: &str,
) -> Result<String, AppError> {
    let body = request_body(
        config,
        prompt,
        "你是知拾知识卡片编辑器。严格限定当前知识点，只输出精炼 JSON。",
        1024,
    );
    let text = post_json(client, config, api_key, "chat/completions", &body).await?;
    extract_content(&text)
}

pub async fn generate_practice(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    prompt: &str,
    count: usize,
) -> Result<String, AppError> {
    let max_tokens = (1024 + count.saturating_mul(768)).min(16384);
    let body = request_body(
        config,
        prompt,
        "你是知拾复习题设计器。只根据给定错题、错误点和难度要求输出 JSON。",
        max_tokens,
    );
    let text = post_json(client, config, api_key, "chat/completions", &body).await?;
    extract_content(&text)
}

fn request_body(
    config: &ApiProviderConfig,
    prompt: &str,
    system: &str,
    max_tokens: usize,
) -> Value {
    json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": max_tokens,
        "stream": false
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_is_small_and_has_no_tools() {
        let config = ApiProviderConfig {
            name: "test".into(),
            base_url: "https://example.com".into(),
            model: "model".into(),
        };
        let body = request_body(&config, "只写当前知识点", "系统提示", 1024);
        assert_eq!(body["max_tokens"], 1024);
        assert!(body.get("tools").is_none());
    }
}
