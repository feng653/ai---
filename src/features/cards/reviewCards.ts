import {
  UNCATEGORIZED_CHAPTER_FILTER,
  type Card,
  type KnowledgePoint,
} from "../../domain/card";
import type { PracticeCardDraft } from "../../services/cardService";
import { buildReviewSet } from "./learningContent";
import type { KnowledgeSelection } from "./knowledgeTree";

export function pointKey(point: KnowledgePoint): string {
  return [point.subject, point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER, point.name]
    .map(encodeURIComponent).join("/");
}

export function reviewSources(cards: Card[], selectedPointKeys: Set<string>): Card[] {
  return cards.filter((card) => (card.kind ?? "mistake") === "mistake"
    && card.knowledgePoints.some((point) => selectedPointKeys.has(pointKey(point))));
}

function selectionForSource(card: Card, selectedPointKeys: Set<string>): KnowledgeSelection {
  const point = card.knowledgePoints.find((item) => selectedPointKeys.has(pointKey(item)))
    ?? card.knowledgePoints[0];
  const chapter = point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER;
  return {
    key: pointKey(point), label: point.name, subject: point.subject, chapter, point: point.name,
  };
}

export function buildPracticeCardDrafts(
  cards: Card[], selectedPointKeys: Set<string>, count: number,
): PracticeCardDraft[] {
  const sources = reviewSources(cards, selectedPointKeys);
  const total = Math.max(sources.length, Math.min(50, Math.trunc(count) || sources.length));
  if (!sources.length) return [];
  return Array.from({ length: total }, (_, index) => {
    const source = sources[index % sources.length];
    const selection = selectionForSource(source, selectedPointKeys);
    const variant = buildReviewSet([source], selection, 5, index)[index % 5];
    const knowledgePoints = source.knowledgePoints
      .filter((point) => selectedPointKeys.has(pointKey(point))).slice(0, 3);
    return {
      input: {
        subject: source.subject,
        question: variant.prompt,
        userAnswer: "",
        correctAnswer: variant.answer,
        supplementalNote: `由来源错题“${source.question || "图片题"}”生成的习题卡。`,
        solution: variant.explanation,
        errorLocation: "",
        errorReason: "",
        errorType: "",
        knowledgePoints,
        assets: [],
      },
      sourceRevisions: [{ cardId: source.id, revision: source.revision }],
    };
  });
}
