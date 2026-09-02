mod api_client;
mod codex;
mod codex_auth;
#[cfg(test)]
mod live_tests;
mod manager;
mod manager_state;
mod process;
mod process_error;
mod prompt;
mod proposal;
#[cfg(test)]
mod proposal_tests;
mod settings;

pub use manager::AiManager;
pub use manager_state::ProviderSummary;
pub use proposal::AiProposal;
pub use settings::ApiProviderInput;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProgress {
    pub stage: &'static str,
    pub message: String,
}
