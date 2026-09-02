import { applyAiProposal, type AiProposal, type ProposalKey } from "../../domain/ai";
import { emptyCardInput, type Card, type CardAsset, type CardInput } from "../../domain/card";
import type { AgentChange, AgentProposal } from "./types";

const LABELS: Record<ProposalKey, string> = {
  question: "题目",
  userAnswer: "我的作答",
  correctAnswer: "正确答案",
  solution: "解题过程",
  errorLocation: "错误位置",
  errorReason: "错误原因",
  errorType: "错误类型",
  knowledgePoints: "知识点",
};

let sequence = 0;
export const agentId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

export function cardReferenceLabel(card: Card): string {
  const question = card.question.replace(/\s+/g, " ").trim();
  if (question) return question.length > 28 ? `${question.slice(0, 28)}…` : question;
  const point = card.knowledgePoints[0]?.name;
  return point ? `${point}（图片题）` : `图片错题 ${card.id.slice(0, 6)}`;
}

function storedAsset(asset: CardAsset): CardAsset {
  const { previewUrl: _previewUrl, ...stored } = asset;
  return stored;
}

export function prepareAgentInput(target: Card | undefined, assets: CardAsset[]): CardInput {
  const base = target ? {
    subject: target.subject,
    question: target.question,
    userAnswer: target.userAnswer,
    correctAnswer: target.correctAnswer,
    supplementalNote: target.supplementalNote,
    solution: target.solution,
    errorLocation: target.errorLocation,
    errorReason: target.errorReason,
    errorType: target.errorType,
    knowledgePoints: structuredClone(target.knowledgePoints),
    assets: target.assets.map(storedAsset),
  } : emptyCardInput();
  return { ...base, assets: [...base.assets, ...assets.map(storedAsset)] };
}

function displayValue(key: ProposalKey, value: unknown): string {
  if (key !== "knowledgePoints") return String(value);
  return (value as Array<{ chapter?: string | null; name: string }>)
    .map((point) => [point.chapter, point.name].filter(Boolean).join(" / ")).join("、");
}

export function buildAgentProposal(
  ai: AiProposal,
  base: CardInput,
  target: Card | undefined,
  newAssets: CardAsset[],
): AgentProposal {
  const accepted = (Object.keys(ai.fields) as ProposalKey[]).filter((key) => {
    const field = ai.fields[key];
    return field?.value != null && !field.uncertain;
  });
  const input = applyAiProposal(base, ai, accepted);
  const changes: AgentChange[] = accepted.map((key) => ({
    key, label: LABELS[key], value: displayValue(key, ai.fields[key]!.value),
  }));
  const uncertainWarnings = (Object.keys(ai.fields) as ProposalKey[]).flatMap((key) => {
    const field = ai.fields[key];
    return field?.value != null && field.uncertain
      ? [`${LABELS[key]}未采用：${field.uncertainReason || "AI 无法确定"}`] : [];
  });
  if (newAssets.length) changes.unshift({
    key: "assets", label: "新增图片", value: `${newAssets.length} 张`,
  });
  if (target) changes.unshift({
    key: "target", label: "目标卡片", value: cardReferenceLabel(target),
  });
  return {
    id: agentId("proposal"),
    kind: target ? "update" : "create",
    targetId: target?.id,
    targetLabel: target && cardReferenceLabel(target),
    expectedRevision: target?.revision,
    input,
    changes,
    warnings: [...new Set([...ai.warnings, ...uncertainWarnings])],
    newAssetIds: newAssets.map((asset) => asset.id),
    status: "pending",
  };
}
