use super::settings::ApiProviderConfig;
use super::{deepseek, proposal, AgentRequest, AiProposal};
use crate::domain::CardInput;
use crate::error::AppError;
use base64::Engine;
use reqwest::{Client, StatusCode};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::time::Duration;
use uuid::Uuid;
const MAX_ERROR_BYTES: usize = 2048;
const MAX_RESPONSE_BYTES: usize = 1024 * 1024;
pub(super) const MAX_IMAGE_INPUT_BYTES: usize = 32 * 1024 * 1024;
#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}
#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
}
#[derive(Debug, Deserialize)]
struct Message {
    content: Option<String>,
}
pub struct OrganizeInput {
    pub card: CardInput,
    pub base_revision: u64,
    pub asset_paths: Vec<PathBuf>,
    pub agent: Option<AgentRequest>,
    pub official_web_search: bool,
}
pub fn http_client() -> Result<Client, AppError> {
    Client::builder()
        .timeout(Duration::from_secs(180))
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("zhishi-desktop/0.1")
        .build()
        .map_err(|error| AppError::new("PROVIDER_ERROR", format!("HTTP 客户端创建失败：{error}")))
}
pub async fn test_connection(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
) -> Result<(), AppError> {
    let response = client
        .get(endpoint(&config.base_url, "models"))
        .bearer_auth(api_key)
        .send()
        .await
        .map_err(network_error)?;
    if response.status().is_success() {
        return Ok(());
    }
    let (status, body) = read_limited(response, MAX_ERROR_BYTES).await?;
    ensure_success(status, body)
}

pub async fn organize(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    input: OrganizeInput,
) -> Result<AiProposal, AppError> {
    let OrganizeInput {
        card,
        base_revision,
        asset_paths,
        agent,
        official_web_search,
    } = input;
    let agent_mode = agent.is_some();
    let web_search = agent
        .as_ref()
        .is_some_and(|request| request.web_search && official_web_search);
    let prompt = if let Some(request) = agent.as_ref() {
        super::prompt::build_agent_prompt(
            &card,
            asset_paths.len(),
            &request.instruction,
            &request.history,
            request.target_provided,
            web_search,
        )?
    } else {
        proposal::build_prompt(&card, asset_paths.len(), None, &[])?
    };
    if web_search {
        let json = deepseek::agent(client, config, api_key, &prompt, &asset_paths).await?;
        return proposal::parse_agent_response(
            &json,
            &card,
            Uuid::new_v4().to_string(),
            base_revision,
            agent
                .as_ref()
                .is_some_and(|request| request.target_provided),
            web_search,
        );
    }
    let content = request_content(&prompt, &asset_paths)?;
    let body = json!({
        "model": config.model,
        "messages": [
            {"role": "system", "content": "你是知拾数学学习 Agent。必须只输出符合要求的 JSON 对象，不要输出 Markdown。"},
            {"role": "user", "content": content}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": if agent_mode { 8192 } else { 4096 },
        "stream": false
    });
    let text = post_json(client, config, api_key, "chat/completions", &body).await?;
    let json = extract_content(&text)?;
    if agent_mode {
        proposal::parse_agent_response(
            &json,
            &card,
            Uuid::new_v4().to_string(),
            base_revision,
            agent.is_some_and(|request| request.target_provided),
            false,
        )
    } else {
        proposal::parse_proposal(&json, &card, Uuid::new_v4().to_string(), base_revision)
    }
}

pub(super) async fn post_json(
    client: &Client,
    config: &ApiProviderConfig,
    api_key: &str,
    path: &str,
    body: &Value,
) -> Result<String, AppError> {
    let response = client
        .post(endpoint(&config.base_url, path))
        .bearer_auth(api_key)
        .json(body)
        .send()
        .await
        .map_err(network_error)?;
    let (status, text) = read_limited(response, MAX_RESPONSE_BYTES).await?;
    ensure_success(status, text.clone())?;
    Ok(text)
}

fn request_content(prompt: &str, images: &[PathBuf]) -> Result<Value, AppError> {
    if images.is_empty() {
        return Ok(Value::String(prompt.into()));
    }
    let mut blocks = vec![json!({"type": "text", "text": prompt})];
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
        blocks.push(json!({
            "type": "image_url",
            "image_url": {"url": format!("data:{mime};base64,{encoded}")}
        }));
    }
    Ok(Value::Array(blocks))
}

pub(super) fn image_mime(path: &Path) -> Result<&'static str, AppError> {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .as_deref()
    {
        Some("png") => Ok("image/png"),
        Some("jpg" | "jpeg") => Ok("image/jpeg"),
        Some("gif") => Ok("image/gif"),
        Some("webp") => Ok("image/webp"),
        _ => Err(AppError::validation("AI 暂不支持该图片格式")),
    }
}

pub(super) fn extract_content(body: &str) -> Result<String, AppError> {
    let response: ChatResponse = serde_json::from_str(body).map_err(|error| {
        AppError::new("INVALID_AI_OUTPUT", format!("API 响应格式无效：{error}"))
    })?;
    response
        .choices
        .into_iter()
        .next()
        .and_then(|choice| choice.message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| AppError::new("INVALID_AI_OUTPUT", "API 未返回可用内容"))
}

fn endpoint(base_url: &str, path: &str) -> String {
    format!("{}/{}", base_url.trim_end_matches('/'), path)
}

fn ensure_success(status: StatusCode, body: String) -> Result<(), AppError> {
    if status.is_success() {
        return Ok(());
    }
    let code = match status.as_u16() {
        401 | 403 => "AUTH_EXPIRED",
        429 => "RATE_LIMITED",
        _ if status.is_server_error() => "PROVIDER_UNAVAILABLE",
        _ => "PROVIDER_ERROR",
    };
    let detail: String = body.chars().take(MAX_ERROR_BYTES).collect();
    Err(AppError::new(
        code,
        format!("AI 服务返回 HTTP {}：{}", status.as_u16(), detail),
    ))
}

async fn read_limited(
    mut response: reqwest::Response,
    limit: usize,
) -> Result<(StatusCode, String), AppError> {
    let status = response.status();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(network_error)? {
        if bytes.len().saturating_add(chunk.len()) > limit {
            return Err(AppError::new(
                "INVALID_AI_OUTPUT",
                "AI 服务响应超过大小限制",
            ));
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok((status, String::from_utf8_lossy(&bytes).into_owned()))
}

fn network_error(error: reqwest::Error) -> AppError {
    if error.is_timeout() {
        AppError::new("PROVIDER_TIMEOUT", "AI 服务请求超过 180 秒")
    } else {
        AppError::new("PROVIDER_UNAVAILABLE", format!("AI 服务连接失败：{error}"))
    }
}

#[cfg(test)]
#[path = "api_client_tests.rs"]
mod tests;
