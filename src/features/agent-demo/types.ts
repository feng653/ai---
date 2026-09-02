import type { CardInput } from "../../domain/card";

export type AgentAttachment = {
  id: string;
  name: string;
  previewUrl: string;
  file: File;
};

export type AgentChange = {
  key: string;
  label: string;
  value: string;
};

export type AgentProposal = {
  id: string;
  kind: "create" | "update";
  targetId?: string;
  targetLabel?: string;
  expectedRevision?: number;
  input: CardInput;
  changes: AgentChange[];
  warnings: string[];
  newAssetIds: string[];
  status: "pending" | "applying" | "applied" | "rejected" | "failed";
  error?: string;
};

export type AgentMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  attachments?: AgentAttachment[];
  proposalId?: string;
};
