use crate::domain::{Card, CardAsset, CardInput, KnowledgePoint};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTurnRequest {
    pub run_id: String,
    pub message: String,
    #[serde(default)]
    pub history: Vec<String>,
    #[serde(default)]
    pub references: Vec<String>,
    #[serde(default)]
    pub assets: Vec<CardAsset>,
    #[serde(default)]
    pub mode: InteractionMode,
    #[serde(default)]
    pub reasoning_effort: ReasoningEffort,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InteractionMode {
    #[default]
    Auto,
    ChatOnly,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReasoningEffort {
    Low,
    #[default]
    Medium,
    High,
}

impl ReasoningEffort {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
        }
    }

    pub fn max_steps(self) -> usize {
        match self {
            Self::Low => 4,
            Self::Medium => 8,
            Self::High => 12,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStep {
    pub action: ModelAction,
    pub message: Option<String>,
    pub decision_summary: String,
    pub tool_call: Option<ModelToolCall>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelAction {
    Final,
    Tool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelToolCall {
    pub name: String,
    pub query: Option<String>,
    pub card_id: Option<String>,
    pub expected_revision: Option<u64>,
    pub input: Option<CardInput>,
    pub changes: Option<CardChanges>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardChanges {
    pub subject: Option<String>,
    pub question: Option<String>,
    pub user_answer: Option<String>,
    pub correct_answer: Option<String>,
    pub supplemental_note: Option<String>,
    pub solution: Option<String>,
    pub error_location: Option<String>,
    pub error_reason: Option<String>,
    pub error_type: Option<String>,
    pub knowledge_points: Option<Vec<KnowledgePoint>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRunResult {
    pub run_id: String,
    pub status: RunStatus,
    pub message: String,
    pub approval: Option<ApprovalView>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Completed,
    WaitingApproval,
    Cancelled,
    LimitReached,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalView {
    pub approval_id: String,
    pub call_id: String,
    pub tool_name: String,
    pub title: String,
    pub impact: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveApprovalRequest {
    pub approval_id: String,
    pub approved: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalResult {
    pub run_id: String,
    pub approved: bool,
    pub message: String,
    pub card: Option<Card>,
    pub deleted_card_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolManifestView {
    pub name: &'static str,
    pub description: &'static str,
    pub side_effect: bool,
    pub approval_required: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum AgentEvent {
    Status {
        label: String,
    },
    DecisionSummary {
        text: String,
    },
    ToolStarted {
        call_id: String,
        name: String,
        summary: String,
    },
    ToolCompleted {
        call_id: String,
        name: String,
        summary: String,
    },
    ApprovalRequired {
        approval: ApprovalView,
    },
    ApprovalResolved {
        approval_id: String,
        approved: bool,
    },
    Message {
        text: String,
    },
    RunCompleted {
        status: RunStatus,
    },
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentEventPayload {
    pub request_id: String,
    pub run_id: String,
    pub sequence: u64,
    pub event: AgentEvent,
}

#[cfg(test)]
mod tests {
    use super::AgentEvent;

    #[test]
    fn serializes_tool_event_fields_for_the_frontend_contract() {
        let event = AgentEvent::ToolStarted {
            call_id: "call-1".into(),
            name: "cards.search".into(),
            summary: "查找卡片".into(),
        };
        let value = serde_json::to_value(event).expect("serialize agent event");

        assert_eq!(value["type"], "tool_started");
        assert_eq!(value["callId"], "call-1");
        assert!(value.get("call_id").is_none());

        let approval = serde_json::to_value(AgentEvent::ApprovalResolved {
            approval_id: "approval-1".into(),
            approved: true,
        })
        .expect("serialize approval event");
        assert_eq!(approval["type"], "approval_resolved");
        assert_eq!(approval["approvalId"], "approval-1");
    }
}
