mod approval;
mod continuation;
mod model;
mod model_normalize;
mod protocol;
mod runtime;
mod runtime_support;
mod state;
#[cfg(test)]
mod tests;
mod tools;

pub use continuation::resolve_approval;
pub use protocol::{
    AgentEventPayload, AgentRunResult, ApprovalResult, ResolveApprovalRequest, StartTurnRequest,
    ToolManifestView,
};
pub use runtime::run_turn;
pub use state::AgentRuntimeState;

pub fn tool_manifests() -> Vec<ToolManifestView> {
    tools::TOOLS.to_vec()
}
