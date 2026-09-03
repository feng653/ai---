import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import { buildKnowledgeTree, type KnowledgeSelection, type KnowledgeTreeNode } from "./knowledgeTree";

export type KnowledgeCardContent = {
  selection: KnowledgeSelection;
  sources: Card[];
  coverage: "初始卡片" | "持续积累" | "证据较充分";
  coreMethods: string[];
  preview: string;
  mistakes: Array<{ cardId: string; question: string; content: string }>;
};

export type ReviewQuestion = {
  id: string;
  kind: string;
  prompt: string;
  answer: string;
  explanation: string;
  sourceCardIds: string[];
};

const distinct = (values: Array<string | undefined>) =>
  [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];

function compactPreview(value: string): string {
  const line = value.split(/\r?\n/).map((item) => item.trim()).find(Boolean) ?? value;
  const characters = [...line];
  return characters.length > 90 ? `${characters.slice(0, 90).join("")}…` : line;
}

export function matchesKnowledgeSelection(card: Card, selection: KnowledgeSelection): boolean {
  return card.knowledgePoints.some((point) => point.subject === selection.subject
    && (!selection.chapter || (point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER) === selection.chapter)
    && (!selection.point || point.name === selection.point));
}

export function buildKnowledgeCard(
  cards: Card[], selection: KnowledgeSelection | null,
): KnowledgeCardContent | null {
  if (!selection?.point) return null;
  const sources = cards.filter((card) => matchesKnowledgeSelection(card, selection));
  if (!sources.length) return null;
  const coreMethods = distinct(sources.map((card) => card.solution));
  const mistakes = sources.map((card) => ({
    cardId: card.id,
    question: card.question || "仅保存了题目图片",
    content: card.errorReason.trim() || card.errorLocation.trim() || "这道错题还没有补充个人错因。",
  }));
  return {
    selection,
    sources,
    coverage: sources.length >= 3 ? "证据较充分" : sources.length === 2 ? "持续积累" : "初始卡片",
    coreMethods: coreMethods.length ? coreMethods : ["点击“AI 生成”提炼当前知识点的核心方法。"],
    preview: compactPreview(coreMethods[0] ?? "尚未生成核心方法。"),
    mistakes,
  };
}

function flatten(nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] {
  return nodes.flatMap((item) => [item, ...flatten(item.children)]);
}

export function buildKnowledgeCards(
  cards: Card[], selection: KnowledgeSelection | null,
): KnowledgeCardContent[] {
  const leaves = flatten(buildKnowledgeTree(cards)).filter((item) => item.level === 3
    && (!selection?.subject || item.selection.subject === selection.subject)
    && (!selection?.chapter || item.selection.chapter === selection.chapter)
    && (!selection?.point || item.selection.point === selection.point));
  return leaves.map((leaf) => buildKnowledgeCard(cards, leaf.selection))
    .filter((card): card is KnowledgeCardContent => Boolean(card))
    .sort((left, right) => right.sources.length - left.sources.length
      || left.selection.point!.localeCompare(right.selection.point!, "zh-CN"));
}

type ReviewTemplate = (card: Card, topic: string, index: number) => Omit<ReviewQuestion, "id">;

const templates: ReviewTemplate[] = [
  (card) => ({
    kind: "原题再练", prompt: card.question || "请重新完成来源错题。",
    answer: card.correctAnswer || card.solution || "来源错题尚未补充标准答案。",
    explanation: card.solution || card.errorReason || "请先完善来源错题的解析。", sourceCardIds: [card.id],
  }),
  (card) => ({
    kind: "错因辨析", prompt: `回看这道题，你原来的解答“${card.userAnswer || "未记录"}”问题在哪里？`,
    answer: card.errorReason || card.errorLocation || "来源错题尚未补充错因。",
    explanation: card.solution || card.correctAnswer || "请对照来源错题补充分析。", sourceCardIds: [card.id],
  }),
  (card, topic) => ({
    kind: "方法复述", prompt: `不直接照抄答案，复述解决“${topic}”这道题的关键步骤。`,
    answer: card.solution || card.correctAnswer || "来源错题尚未补充解题步骤。",
    explanation: card.errorReason || "完成后与来源错题的正确解法核对。", sourceCardIds: [card.id],
  }),
  (card) => ({
    kind: "定位纠错", prompt: `指出这道题最需要纠正的步骤：${card.question || "来源错题"}`,
    answer: card.errorLocation || card.errorReason || "来源错题尚未标记错误位置。",
    explanation: card.correctAnswer || card.solution || "请先完善来源错题。", sourceCardIds: [card.id],
  }),
  (card, topic) => ({
    kind: "自检清单", prompt: `完成下一道“${topic}”题后，你应重点检查什么？`,
    answer: card.errorReason || card.errorLocation || "检查条件、步骤和最终结论。",
    explanation: card.solution || card.correctAnswer || "结合这道来源错题进行复盘。", sourceCardIds: [card.id],
  }),
];

export function buildReviewSet(
  cards: Card[], selection: KnowledgeSelection | null, questionCount: number, rotation = 0,
): ReviewQuestion[] {
  const knowledgeCard = buildKnowledgeCard(cards, selection);
  if (!knowledgeCard) return [];
  const sources = knowledgeCard.sources;
  const pool = templates.map((template, index) => {
    const source = sources[index % sources.length];
    return { id: `${source.id}-${index}`, ...template(source, selection!.point!, index) };
  });
  const count = Math.max(1, Math.min(templates.length, Math.trunc(questionCount) || 1));
  return Array.from({ length: count }, (_, index) => pool[(rotation + index) % pool.length]);
}
