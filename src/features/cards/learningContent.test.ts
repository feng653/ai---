import { describe, expect, it } from "vitest";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { buildKnowledgeCard, buildKnowledgeCards, buildReviewSet } from "./learningContent";

const seriesSelection: KnowledgeSelection = {
  key: "物理/电学/串联电路", label: "串联电路", subject: "物理", chapter: "电学", point: "串联电路",
};

const seriesCard: Card = {
  id: "series-circuit", subject: "物理", question: "3Ω 与 5Ω 电阻串联，总电阻是多少？",
  userAnswer: "15Ω", correctAnswer: "8Ω", supplementalNote: "", solution: "串联电路的总电阻等于各分电阻之和。",
  errorLocation: "误用了并联电阻公式。", errorReason: "混淆了串联与并联电阻的计算方法。", errorType: "公式或定理使用错误",
  knowledgePoints: [{ subject: "物理", chapter: "电学", name: "串联电路" }], assets: [], status: "organized",
  revision: 1, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("learning content", () => {
  it("aggregates one topic into one continuously derived knowledge card", () => {
    const cards = buildKnowledgeCards([seriesCard], null);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ coverage: "初始卡片", sources: [seriesCard] });
    expect(cards[0].coreMethods).toContain("串联电路的总电阻等于各分电阻之和。");
    expect(cards[0].preview).toBe("串联电路的总电阻等于各分电阻之和。");
    expect(cards[0].mistakes[0].content).toBe("混淆了串联与并联电阻的计算方法。");
    expect(cards[0]).not.toHaveProperty("summary");
  });

  it("only builds a detail for a concrete knowledge point", () => {
    expect(buildKnowledgeCard([seriesCard], { ...seriesSelection, point: undefined })).toBeNull();
    expect(buildKnowledgeCard([seriesCard], seriesSelection)?.sources).toHaveLength(1);
  });

  it.each([1, 3, 5])("honors a review generation count of %i", (count) => {
    const questions = buildReviewSet([seriesCard], seriesSelection, count);
    expect(questions).toHaveLength(count);
    expect(new Set(questions.map((question) => question.id))).toHaveLength(count);
    expect(questions.every((question) => question.answer && question.explanation)).toBe(true);
  });
});
