import type { CardInput, ErrorType, KnowledgePoint } from "./card";

export type AiProviderState = "unavailable" | "disconnected" | "checking" | "connected" | "expired";

export type AiProviderStatus = {
  state: AiProviderState;
  provider: string;
  message: string;
};

export type ProposedField<T> = {
  value: T | null;
  uncertain: boolean;
  uncertainReason?: string;
  source: "image" | "user_text" | "inference";
};

export type AiProposalFields = {
  question?: ProposedField<string>;
  userAnswer?: ProposedField<string>;
  correctAnswer?: ProposedField<string>;
  solution?: ProposedField<string>;
  errorLocation?: ProposedField<string>;
  errorReason?: ProposedField<string>;
  errorType?: ProposedField<ErrorType>;
  knowledgePoints?: ProposedField<KnowledgePoint[]>;
};

export type AiProposal = {
  runId: string;
  baseRevision: number;
  promptVersion: string;
  fields: AiProposalFields;
  warnings: string[];
};

export type ProposalKey = keyof AiProposalFields;

export function getDefaultAcceptedFields(input: CardInput, proposal: AiProposal): ProposalKey[] {
  const accepted: ProposalKey[] = [];
  for (const key of Object.keys(proposal.fields) as ProposalKey[]) {
    const suggestion = proposal.fields[key];
    if (!suggestion || suggestion.uncertain || suggestion.value === null) continue;
    const current = input[key];
    const empty = Array.isArray(current) ? current.length === 0 : !String(current ?? "").trim();
    if (empty) accepted.push(key);
  }
  return accepted;
}

export function applyAiProposal(
  input: CardInput,
  proposal: AiProposal,
  accepted: ProposalKey[],
): CardInput {
  const next: CardInput = structuredClone(input);
  for (const key of accepted) {
    const suggestion = proposal.fields[key];
    if (!suggestion || suggestion.value === null) continue;
    if (key === "knowledgePoints") {
      next.knowledgePoints = structuredClone(suggestion.value as KnowledgePoint[]).slice(0, 3);
    } else if (key === "errorType") {
      next.errorType = suggestion.value as ErrorType;
    } else {
      next[key] = String(suggestion.value);
    }
  }
  return next;
}
