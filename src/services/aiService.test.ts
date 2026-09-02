import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { describe, expect, it, vi } from "vitest";
import { emptyCardInput } from "../domain/card";
import { BrowserUnavailableAiService, TauriAiService } from "./aiService";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));

describe("TauriAiService", () => {
  it("forwards provider configuration without renaming secret fields", async () => {
    vi.mocked(invoke).mockResolvedValue({ state: "connected", provider: "deepseek" });
    const service = new TauriAiService();
    const input = { id: "deepseek" as const, name: "DeepSeek API", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash", apiKey: "secret" };
    await service.saveApiProvider(input);
    expect(invoke).toHaveBeenCalledWith("save_api_provider", { input });
    await service.testApiProvider(input);
    expect(invoke).toHaveBeenCalledWith("test_api_provider", { input });
  });

  it("filters progress events by request and forwards the real invocation", async () => {
    const unlisten = vi.fn();
    let handler: ((event: { payload: Record<string, string> }) => void) | undefined;
    vi.mocked(listen).mockImplementation(async (_event, callback) => {
      handler = callback as typeof handler;
      return unlisten;
    });
    vi.mocked(invoke).mockImplementation(async (command, args) => {
      if (command !== "organize_card") throw new Error("unexpected command");
      const requestId = (args as { requestId: string }).requestId;
      handler?.({ payload: { requestId: "another-run", stage: "analyzing", message: "ignore" } });
      handler?.({ payload: { requestId, stage: "validating", message: "正在验证" } });
      return { runId: "run-1", baseRevision: 2, promptVersion: "v2", fields: {}, warnings: [] };
    });
    const progress = vi.fn();
    const service = new TauriAiService();
    const input = emptyCardInput();

    await expect(service.organize(input, 2, progress, "再简短一点", ["先给出完整解法"]))
      .resolves.toMatchObject({ runId: "run-1" });

    expect(progress).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenCalledWith({ stage: "validating", message: "正在验证" });
    expect(unlisten).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("organize_card", {
      input,
      baseRevision: 2,
      requestId: expect.any(String),
      agentTurn: { instruction: "再简短一点", history: ["先给出完整解法"] },
    });
  });
});

describe("BrowserUnavailableAiService", () => {
  it("does not pretend a browser demo is connected", async () => {
    const service = new BrowserUnavailableAiService();
    await expect(service.connect()).resolves.toMatchObject({ state: "unavailable" });
    await expect(service.organize()).rejects.toThrow("桌面应用");
  });
});
