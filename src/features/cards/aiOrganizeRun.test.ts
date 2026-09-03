import { describe, expect, it, vi } from "vitest";
import { emptyCardInput } from "../../domain/card";
import type { AiProgress } from "../../services/aiService";
import { AiOrganizeRunStore } from "./aiOrganizeRun";

const proposal = {
  action: "update_card" as const, message: "整理完成", sources: [],
  runId: "run-1", baseRevision: 2, promptVersion: "v1", warnings: [],
  fields: { solution: { value: "新解法", uncertain: false, source: "inference" as const } },
};

describe("AiOrganizeRunStore", () => {
  it("retains progress and the completed proposal while the page is unsubscribed", async () => {
    let reportProgress: ((progress: AiProgress) => void) | undefined;
    let finish: ((value: typeof proposal) => void) | undefined;
    const organize = vi.fn((_input, _revision, onProgress) => {
      reportProgress = onProgress;
      return new Promise<typeof proposal>((resolve) => { finish = resolve; });
    });
    const store = new AiOrganizeRunStore({ organize });
    const listener = vi.fn();
    const unsubscribe = store.subscribe("card:1", listener);

    store.start("card:1", emptyCardInput(), 2);
    expect(store.get("card:1")).toMatchObject({ status: "running" });
    store.start("card:1", emptyCardInput(), 2);
    expect(organize).toHaveBeenCalledOnce();
    reportProgress?.({ stage: "analyzing", message: "正在分析" });
    expect(store.get("card:1")).toMatchObject({
      status: "running", progress: { message: "正在分析" },
    });

    unsubscribe();
    finish?.(proposal);
    await vi.waitFor(() => expect(store.get("card:1")).toMatchObject({
      status: "succeeded", proposal: { runId: "run-1" },
    }));

    const returningPage = vi.fn();
    store.subscribe("card:1", returningPage);
    expect(store.get("card:1")).toMatchObject({ status: "succeeded" });
  });

  it("retains failures for a returning page and allows dismissing them", async () => {
    const organize = vi.fn().mockRejectedValue(new Error("模型超时"));
    const store = new AiOrganizeRunStore({ organize });
    store.start("card:2", emptyCardInput(), 0);

    await vi.waitFor(() => expect(store.get("card:2")).toMatchObject({
      status: "failed", message: "模型超时",
    }));
    store.dismiss("card:2");
    expect(store.get("card:2")).toEqual({ status: "idle" });
  });
});
