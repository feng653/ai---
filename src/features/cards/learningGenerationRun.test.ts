import { describe, expect, it, vi } from "vitest";
import type { GeneratedKnowledgeCard, GeneratedPracticeCardDraft } from "../../domain/ai";
import type { Card } from "../../domain/card";
import {
  createKnowledgeGenerationRunStore, createPracticeGenerationRunStore,
  initialKnowledgeProgress, initialPracticeProgress,
} from "./learningGenerationRun";

const connected = { state: "connected" as const, provider: "deepseek", message: "ok" };
const generated: GeneratedKnowledgeCard = {
  runId: "run-1", promptVersion: "knowledge-v1", coreMethod: "核心方法",
  mistakeReminder: "易错提醒", sourceRevisions: [{ cardId: "source", revision: 2 }], warnings: [],
};
const knowledgeInput = {
  key: "数学/函数/单调性", subject: "数学", chapter: "函数", name: "单调性",
  request: {
    topic: { subject: "数学", chapter: "函数", name: "单调性" },
    sourceCards: [],
  },
};

describe("learning generation runs", () => {
  it("finishes and persists a knowledge draft while no page is subscribed", async () => {
    let finish: ((result: GeneratedKnowledgeCard) => void) | undefined;
    const service = {
      getStatus: vi.fn().mockResolvedValue(connected), connect: vi.fn(),
      generateKnowledgeCard: vi.fn(() => new Promise<GeneratedKnowledgeCard>((resolve) => { finish = resolve; })),
      generatePracticeCards: vi.fn(),
      saveKnowledgeCard: vi.fn((input) => Promise.resolve({
        ...input, createdAt: "2026-09-04T00:00:00Z", updatedAt: "2026-09-04T00:00:00Z",
      })),
    };
    const store = createKnowledgeGenerationRunStore(service);
    const unsubscribe = store.subscribe(knowledgeInput.key, vi.fn());
    store.start(knowledgeInput.key, knowledgeInput, initialKnowledgeProgress);
    unsubscribe();
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    finish?.(generated);

    await vi.waitFor(() => expect(store.get(knowledgeInput.key)).toMatchObject({
      status: "succeeded", result: { status: "draft", content: { runId: "run-1" } },
    }));
    expect(service.saveKnowledgeCard).toHaveBeenCalledWith(expect.objectContaining({
      key: knowledgeInput.key, status: "draft", content: generated,
    }));
  });

  it("finishes and saves practice cards while no page is subscribed", async () => {
    let finish: ((result: GeneratedPracticeCardDraft[]) => void) | undefined;
    const service = {
      getStatus: vi.fn().mockResolvedValue(connected), connect: vi.fn(),
      generateKnowledgeCard: vi.fn(),
      generatePracticeCards: vi.fn(() => new Promise<GeneratedPracticeCardDraft[]>((resolve) => { finish = resolve; })),
      saveKnowledgeCard: vi.fn(),
    };
    const saved = [{ id: "practice-1" }] as Card[];
    const cards = { savePracticeCards: vi.fn().mockResolvedValue(saved) };
    const store = createPracticeGenerationRunStore(service, cards);
    const request = { topics: [], sourceCards: [], count: 1, difficulty: "same" as const };
    store.start("practice", request, initialPracticeProgress);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    finish?.([]);

    await vi.waitFor(() => expect(store.get("practice")).toMatchObject({
      status: "succeeded", result: saved,
    }));
    expect(cards.savePracticeCards).toHaveBeenCalledWith([]);
  });

  it("retains a failed run so a returning page can retry", async () => {
    const service = {
      getStatus: vi.fn().mockRejectedValue(new Error("模型超时")), connect: vi.fn(),
      generateKnowledgeCard: vi.fn(), generatePracticeCards: vi.fn(), saveKnowledgeCard: vi.fn(),
    };
    const store = createKnowledgeGenerationRunStore(service);
    store.start(knowledgeInput.key, knowledgeInput, initialKnowledgeProgress);
    await vi.waitFor(() => expect(store.get(knowledgeInput.key)).toMatchObject({
      status: "failed", message: "模型超时",
    }));
  });
});
