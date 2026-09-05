import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import { buildKnowledgeTree, type KnowledgeSelection, type KnowledgeTreeNode } from "./knowledgeTree";

export function matchesKnowledgeSelection(card: Card, selection: KnowledgeSelection): boolean {
  if (selection.unclassified) return !card.knowledgePoints.some((point) => point.name.trim());
  return card.knowledgePoints.some((point) => point.subject === selection.subject
    && (!selection.chapter || (point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER) === selection.chapter)
    && (!selection.point || point.name === selection.point));
}

export function buildReviewTopics(cards: Card[], selection: KnowledgeSelection | null) {
  if (selection?.unclassified) return [];
  const flatten = (nodes: KnowledgeTreeNode[]): KnowledgeTreeNode[] => nodes.flatMap((node) => [node, ...flatten(node.children)]);
  return flatten(buildKnowledgeTree(cards)).filter((node) => node.level === 3
    && (!selection?.subject || node.selection.subject === selection.subject)
    && (!selection?.chapter || node.selection.chapter === selection.chapter)
    && (!selection?.point || node.selection.point === selection.point))
    .map((node) => ({ selection: node.selection, sources: cards.filter((card) => matchesKnowledgeSelection(card, node.selection)) }));
}
