export type DemoAttachment = {
  id: string;
  name: string;
  previewUrl: string;
};

export type DemoCard = {
  id: string;
  subject: string;
  question: string;
  correctAnswer: string;
  errorReason: string;
  status: "draft" | "organized";
};

export type DemoProposal = {
  id: string;
  kind: "create" | "update";
  targetId?: string;
  patch: Partial<DemoCard>;
  changes: Array<{ label: string; value: string }>;
  status: "pending" | "applied" | "rejected";
};

export type DemoMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  attachments?: DemoAttachment[];
  proposalId?: string;
};
