use crate::domain::CardInput;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AgentTurn {
    pub(super) instruction: String,
    pub(super) history: Vec<String>,
    pub(super) target_provided: bool,
    #[serde(default)]
    pub(super) web_search: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OrganizeCardRequest {
    pub(super) input: CardInput,
    pub(super) base_revision: u64,
    pub(super) agent_turn: Option<AgentTurn>,
    #[serde(default)]
    pub(super) additional_requirements: Option<String>,
}
