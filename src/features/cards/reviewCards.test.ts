import { describe, expect, it } from "vitest";
import type { Card } from "../../domain/card";
import { buildPracticeCardDrafts, pointKey, reviewSources } from "./reviewCards";

function card(id: string, point: string, revision: number): Card {
  return {
    id, subject: "数学", question: `${point} 来源题`, userAnswer: "原作答",
    correctAnswer: "标准答案", supplementalNote: "", solution: "解题步骤",
    errorLocation: "第一步", errorReason: "漏掉条件", errorType: "审题错误",
    knowledgePoints: [{ subject: "数学", chapter: "函数", name: point }], assets: [],
    status: "organized", revision, createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z", kind: "mistake", sourceRevisions: [],
  };
}

describe("practice card generation", () => {
  it("supports multiple knowledge points and covers every selected source", () => {
    const sources = [card("a", "单调性", 2), card("b", "奇偶性", 4)];
    const selected = new Set(sources.map((item) => pointKey(item.knowledgePoints[0])));
    expect(reviewSources(sources, selected)).toHaveLength(2);

    const drafts = buildPracticeCardDrafts(sources, selected, 4);
    expect(drafts).toHaveLength(4);
    expect(new Set(drafts.flatMap((item) => item.sourceRevisions.map((source) => source.cardId))))
      .toEqual(new Set(["a", "b"]));
    expect(drafts[0].sourceRevisions).toEqual([{ cardId: "a", revision: 2 }]);
    expect(drafts.every((item) => item.input.solution && item.input.knowledgePoints.length)).toBe(true);
  });

  it("raises the requested count to the source count", () => {
    const sources = [card("a", "单调性", 1), card("b", "单调性", 1)];
    const selected = new Set([pointKey(sources[0].knowledgePoints[0])]);
    expect(buildPracticeCardDrafts(sources, selected, 1)).toHaveLength(2);
  });
});
