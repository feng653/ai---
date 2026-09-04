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
