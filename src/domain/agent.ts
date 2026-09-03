import type { Card, CardAsset } from "./card";

export type AgentMode = "auto" | "chat_only";
export type AgentReasoningEffort = "low" | "medium" | "high";
export type AgentRunStatus = "completed" | "waiting_approval" | "cancelled" | "limit_reached";

export type AgentStartTurnRequest = {
  runId: string;
  message: string;
  history: string[];
  references: string[];
  assets: CardAsset[];
  mode: AgentMode;
  reasoningEffort: AgentReasoningEffort;
};

export type AgentApproval = {
  approvalId: string;
  callId: string;
  toolName: string;
  title: string;
  impact: string;
};

export type AgentRunResult = {
  runId: string;
  status: AgentRunStatus;
  message: string;
  approval?: AgentApproval;
};

export type AgentApprovalResult = {
  runId: string;
  approved: boolean;
  message: string;
  card?: Card;
  deletedCardId?: string;
};

export type AgentToolManifest = {
  name: string;
  description: string;
  sideEffect: boolean;
  approvalRequired: boolean;
};

export type AgentEvent =
  | { type: "status"; label: string }
  | { type: "decision_summary"; text: string }
  | { type: "tool_started"; callId: string; name: string; summary: string }
  | { type: "tool_completed"; callId: string; name: string; summary: string }
  | { type: "approval_required"; approval: AgentApproval }
  | { type: "message"; text: string }
  | { type: "run_completed"; status: AgentRunStatus };

export type AgentEventPayload = {
  requestId: string;
  runId: string;
  sequence: number;
  event: AgentEvent;
};

export type AgentToolActivity = {
  callId: string;
  name: string;
  summary: string;
  status: "running" | "completed";
};

export type AgentRunActivity = {
  id: string;
  kind: "run";
  runId: string;
  status: AgentRunStatus | "running";
  label: string;
  summaries: string[];
  tools: AgentToolActivity[];
  approval?: AgentApproval & { status: "pending" | "approved" | "rejected" };
};

export type AgentChatMessage = {
  id: string;
  kind: "message";
  role: "user" | "agent";
  text: string;
  attachments?: Array<{ name: string; previewUrl: string }>;
};

export type AgentTimelineItem = AgentChatMessage | AgentRunActivity;
