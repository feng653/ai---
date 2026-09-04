import { describe, expect, it } from "vitest";
import type { Card } from "../../domain/card";
import {
  buildPracticeGenerationRequest, pointKey, practiceCardsForSelection, reviewSources,
} from "./reviewCards";

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

    const request = buildPracticeGenerationRequest(sources, selected, 4, "harder", "  加入参数讨论  ")!;
    expect(request.count).toBe(4);
    expect(request.difficulty).toBe("harder");
    expect(request.additionalRequirements).toBe("加入参数讨论");
    expect(request.sourceCards.map((item) => ({ id: item.id, revision: item.revision })))
      .toEqual([{ id: "a", revision: 2 }, { id: "b", revision: 4 }]);
    expect(request.sourceCards[0].errorReason).toBe("漏掉条件");
    expect(request.topics).toHaveLength(2);
  });

  it("raises the requested count to the source count", () => {
    const sources = [card("a", "单调性", 1), card("b", "单调性", 1)];
    const selected = new Set([pointKey(sources[0].knowledgePoints[0])]);
    expect(buildPracticeGenerationRequest(sources, selected, 1, "same")?.count).toBe(2);
  });

  it("filters saved practice cards to the current knowledge point", () => {
    const practice = { ...card("p", "单调性", 1), kind: "practice" as const };
    const other = { ...card("q", "奇偶性", 1), kind: "practice" as const };
    expect(practiceCardsForSelection([practice, other], {
      key: "数学/函数/单调性", label: "单调性", subject: "数学", chapter: "函数", point: "单调性",
    })).toEqual([practice]);
  });
});
