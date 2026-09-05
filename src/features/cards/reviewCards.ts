import {
  UNCATEGORIZED_CHAPTER_FILTER,
  type Card,
  type KnowledgePoint,
} from "../../domain/card";
import type { PracticeDifficulty, PracticeGenerationRequest } from "../../domain/ai";
import { matchesKnowledgeSelection } from "./learningContent";
import type { KnowledgeSelection } from "./knowledgeTree";

export function pointKey(point: KnowledgePoint): string {
  return [point.subject, point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER, point.name]
    .map(encodeURIComponent).join("/");
}

export function reviewSources(cards: Card[], selectedPointKeys: Set<string>): Card[] {
  return cards.filter((card) => (card.kind ?? "mistake") === "mistake"
    && card.knowledgePoints.some((point) => selectedPointKeys.has(pointKey(point))));
}

export function practiceCardsForSelection(cards: Card[], selection: KnowledgeSelection | null): Card[] {
  return cards.filter((card) => (card.kind ?? "mistake") === "practice"
    && (!selection || matchesKnowledgeSelection(card, selection)));
}

export function buildPracticeGenerationRequest(
  cards: Card[], selectedPointKeys: Set<string>, count: number, difficulty: PracticeDifficulty,
  additionalRequirements = "", selectedSourceIds?: Set<string>, mode?: "similar" | "recall",
): PracticeGenerationRequest | null {
  const sources = reviewSources(cards, selectedPointKeys).filter((card) => !selectedSourceIds || selectedSourceIds.has(card.id));
  const total = Math.max(sources.length, Math.min(50, Math.trunc(count) || sources.length));
  if (!sources.length) return null;
  const topics = sources.flatMap((card) => card.knowledgePoints)
    .filter((point) => selectedPointKeys.has(pointKey(point)))
    .filter((point, index, all) => all.findIndex((candidate) => pointKey(candidate) === pointKey(point)) === index);
  return {
    ...(mode ? { mode } : {}),
    topics,
    count: total,
    difficulty,
    ...(additionalRequirements.trim()
      ? { additionalRequirements: additionalRequirements.trim() } : {}),
    sourceCards: sources.map((card) => ({
      id: card.id,
      revision: card.revision,
      subject: card.subject,
      question: card.question,
      userAnswer: card.userAnswer,
      correctAnswer: card.correctAnswer,
      solution: card.solution,
      errorLocation: card.errorLocation,
      errorReason: card.errorReason,
      errorType: card.errorType,
      knowledgePoints: card.knowledgePoints,
    })),
  };
}
