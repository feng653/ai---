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
      return {
        action: "reply", message: "已完成", sources: [],
        runId: "run-1", baseRevision: 2, promptVersion: "v2", fields: {}, warnings: [],
      };
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
      requestId: expect.any(String),
      request: {
        input,
        baseRevision: 2,
        agentTurn: {
          instruction: "再简短一点",
          history: ["先给出完整解法"],
          targetProvided: false,
          webSearch: false,
        },
      },
    });
  });

  it("forwards the Agent web-search switch", async () => {
    vi.mocked(listen).mockResolvedValue(vi.fn());
    vi.mocked(invoke).mockResolvedValue({
      action: "reply", message: "回答", sources: [], fields: {}, warnings: [],
      runId: "run-1", baseRevision: 0, promptVersion: "v5",
    });
    const service = new TauriAiService();
    await service.organize(emptyCardInput(), 0, undefined, "查找最新资料", [], false, true);
    expect(invoke).toHaveBeenCalledWith("organize_card", expect.objectContaining({
      request: expect.objectContaining({
        agentTurn: expect.objectContaining({ webSearch: true }),
      }),
    }));
  });

  it("forwards additional requirements without enabling Agent mode", async () => {
    vi.mocked(listen).mockResolvedValue(vi.fn());
    vi.mocked(invoke).mockResolvedValue({
      action: "create_card", message: "完成", sources: [], fields: {}, warnings: [],
      runId: "run-2", baseRevision: 0, promptVersion: "v7",
    });
    const service = new TauriAiService();
    await service.organize(
      emptyCardInput(), 0, undefined, undefined, undefined, undefined, undefined,
      "  只用代数方法  ",
    );
    expect(invoke).toHaveBeenCalledWith("organize_card", expect.objectContaining({
      request: expect.objectContaining({
        agentTurn: null,
        additionalRequirements: "只用代数方法",
      }),
    }));
  });

  it("generates practice drafts through AI with request-scoped progress", async () => {
    const unlisten = vi.fn();
    vi.mocked(listen).mockResolvedValue(unlisten);
    vi.mocked(invoke).mockResolvedValue([]);
    const request = {
      topics: [{ subject: "数学", chapter: "函数", name: "单调性" }],
      sourceCards: [{
        id: "card-1", revision: 2, subject: "数学", question: "来源题", userAnswer: "原答案",
        correctAnswer: "正解", solution: "方法", errorLocation: "第一步", errorReason: "漏条件",
        errorType: "审题错误", knowledgePoints: [{ subject: "数学", chapter: "函数", name: "单调性" }],
      }],
      count: 1, difficulty: "harder" as const,
    };
    await new TauriAiService().generatePracticeCards(request);
    expect(invoke).toHaveBeenCalledWith("generate_practice_cards", {
      request, requestId: expect.any(String),
    });
    expect(unlisten).toHaveBeenCalledOnce();
  });
});

describe("BrowserUnavailableAiService", () => {
  it("does not pretend a browser demo is connected", async () => {
    const service = new BrowserUnavailableAiService();
    await expect(service.connect()).resolves.toMatchObject({ state: "unavailable" });
    await expect(service.organize()).rejects.toThrow("桌面应用");
    await expect(service.generatePracticeCards({} as never)).rejects.toThrow("桌面应用");
  });
});
