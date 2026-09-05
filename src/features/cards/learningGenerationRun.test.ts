import { describe, expect, it, vi } from "vitest";
import type { GeneratedPracticeCardDraft } from "../../domain/ai";
import type { Card } from "../../domain/card";
import { createPracticeGenerationRunStore, initialPracticeProgress } from "./learningGenerationRun";
const connected = { state: "connected" as const, provider: "deepseek", message: "ok" };
describe("practice generation runs", () => {
  it("finishes and saves practice cards while no page is subscribed", async () => {
    let finish: ((result: GeneratedPracticeCardDraft[]) => void) | undefined;
    const service = {
      getStatus: vi.fn().mockResolvedValue(connected), connect: vi.fn(),
      generatePracticeCards: vi.fn(() => new Promise<GeneratedPracticeCardDraft[]>((resolve) => { finish = resolve; })),
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

  it("retains a failed practice run for retry", async () => {
    const service = { getStatus: vi.fn().mockRejectedValue(new Error("模型超时")), connect: vi.fn(), generatePracticeCards: vi.fn() };
    const store = createPracticeGenerationRunStore(service);
    store.start("practice", { topics: [], sourceCards: [], count: 1, difficulty: "same" }, initialPracticeProgress);
    await vi.waitFor(() => expect(store.get("practice")).toMatchObject({ status: "failed", message: "模型超时" }));
  });
});
