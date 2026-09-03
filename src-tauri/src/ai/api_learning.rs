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
    let body = request_body(config, prompt);
    let text = post_json(client, config, api_key, "chat/completions", &body).await?;
    extract_content(&text)
}

fn request_body(config: &ApiProviderConfig, prompt: &str) -> Value {
    json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": "你是知拾知识卡片编辑器。严格限定当前知识点，只输出精炼 JSON。"},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 1024,
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
        let body = request_body(&config, "只写当前知识点");
        assert_eq!(body["max_tokens"], 1024);
        assert!(body.get("tools").is_none());
    }
}
