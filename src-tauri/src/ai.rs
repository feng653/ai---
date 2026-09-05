mod api_agent;
mod api_client;
mod api_learning;
mod codex;
mod codex_app_server;
mod codex_app_server_process;
#[cfg(test)]
mod codex_app_server_tests;
mod codex_assets;
mod codex_auth;
mod codex_practice;
mod deepseek;
#[cfg(test)]
mod live_tests;
mod manager;
mod manager_agent;
mod manager_learning;
mod manager_organize;
mod manager_state;
mod practice;
mod practice_parse;
#[cfg(test)]
mod practice_tests;
mod process;
mod process_error;
#[cfg(test)]
mod process_tests;
#[cfg(windows)]
mod process_windows;
mod prompt;
mod proposal;
#[cfg(test)]
mod proposal_tests;
mod settings;

pub use manager::AiManager;
pub use manager_state::ProviderSummary;
pub use practice::PracticeGenerationRequest;
pub use proposal::AiProposal;
pub use settings::ApiProviderInput;

use serde::Serialize;

pub(crate) struct AgentRequest {
    pub instruction: String,
    pub history: Vec<String>,
    pub target_provided: bool,
    pub web_search: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProgress {
    pub stage: &'static str,
    pub message: String,
}
