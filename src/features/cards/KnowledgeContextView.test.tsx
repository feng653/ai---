import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { KnowledgeContextView } from "./KnowledgeContextView";
import { aiService } from "../../services/aiService";
import { knowledgeGenerationRuns, practiceGenerationRuns } from "./learningGenerationRun";

afterEach(() => {
  cleanup();
  knowledgeGenerationRuns.dismiss(selection.key);
  practiceGenerationRuns.dismiss("practice-generator");
  vi.restoreAllMocks();
});

const selection: KnowledgeSelection = {
  key: "物理/电学/串联电路", label: "串联电路", subject: "物理", chapter: "电学", point: "串联电路",
};
const card: Card = {
  id: "series", subject: "物理", question: "两个电阻串联后接入电路，求总电阻。", userAnswer: "用了并联公式",
  correctAnswer: "R=R₁+R₂", supplementalNote: "", solution: "识别串联关系，再将各分电阻相加。",
  errorLocation: "公式选择", errorReason: "混用了并联电阻公式。", errorType: "公式或定理使用错误",
  knowledgePoints: [{ subject: "物理", chapter: "电学", name: "串联电路" }], assets: [], status: "organized",
  revision: 1, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
};

function renderView(activeSelection: KnowledgeSelection | null = selection) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={client}><KnowledgeContextView
    allCards={[card]} cards={[card]} savedPracticeCards={[]}
    selection={activeSelection} loading={false} onSelectionChange={vi.fn()} onOpenCard={vi.fn()}
    onCreateCard={vi.fn()} />
  </QueryClientProvider>);
  return result.container;
}

describe("KnowledgeContextView", () => {
  it("shows one knowledge card without the removed boilerplate", () => {
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));
    expect(screen.getByRole("heading", { name: "串联电路 · 知识卡片" })).toBeInTheDocument();
    expect(screen.getByText("核心方法")).toBeInTheDocument();
    expect(screen.getByText("你的易错提醒")).toBeInTheDocument();
    expect(screen.queryByText(/汇总 1 张/)).not.toBeInTheDocument();
  });

  it("generates concise scoped content from the current source cards", async () => {
    vi.spyOn(aiService, "getStatus").mockResolvedValue({ state: "connected", provider: "codex", message: "ok" });
    const generate = vi.spyOn(aiService, "generateKnowledgeCard").mockResolvedValue({
      runId: "run-1", promptVersion: "knowledge-v1",
      coreMethod: "串联电路的总电阻等于各分电阻之和。",
      mistakeReminder: "不要误用并联电阻公式。",
      sourceRevisions: [{ cardId: "series", revision: 1 }], warnings: [],
    });
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /附加要求/ }), {
      target: { value: "对比串联与并联公式" },
    });
    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    await waitFor(() => expect(screen.getByText("串联电路的总电阻等于各分电阻之和。")).toBeInTheDocument());
    expect(screen.getByText("不要误用并联电阻公式。")).toBeInTheDocument();
    expect(screen.getByText("AI 草稿预览")).toBeInTheDocument();
    expect(screen.getByText("草稿已自动保留，离开页面后仍可继续")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /保存知识卡片/ }));
    await waitFor(() => expect(screen.getByText("已保存知识卡片")).toBeInTheDocument());
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      topic: { subject: "物理", chapter: "电学", name: "串联电路" },
      additionalRequirements: "对比串联与并联公式",
      sourceCards: [expect.objectContaining({ id: "series", revision: 1 })],
    }), expect.any(Function));
  });

  it("restores a persisted AI draft after the view remounts", async () => {
    vi.spyOn(aiService, "listKnowledgeCards").mockResolvedValue([{
      key: selection.key, subject: "物理", chapter: "电学", name: "串联电路", status: "draft",
      content: {
        runId: "persisted-run", promptVersion: "knowledge-v1",
        coreMethod: "这是重启后恢复的核心方法。", mistakeReminder: "这是恢复的易错提醒。",
        sourceRevisions: [{ cardId: "series", revision: 1 }], warnings: [],
      },
      createdAt: "2026-09-04T00:00:00Z", updatedAt: "2026-09-04T00:00:00Z",
    }]);
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));

    expect(await screen.findByText("这是重启后恢复的核心方法。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存知识卡片/ })).toBeEnabled();
  });

  it("keeps generating after leaving the knowledge tab and restores the draft", async () => {
    let finish: ((value: Awaited<ReturnType<typeof aiService.generateKnowledgeCard>>) => void) | undefined;
    vi.spyOn(aiService, "getStatus").mockResolvedValue({ state: "connected", provider: "deepseek", message: "ok" });
    vi.spyOn(aiService, "generateKnowledgeCard").mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));
    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));
    expect(screen.getByRole("status")).toHaveTextContent("可以离开此页");
    fireEvent.click(screen.getByRole("tab", { name: /关联错题/ }));
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    finish?.({
      runId: "background-run", promptVersion: "knowledge-v1",
      coreMethod: "离页后完成的核心方法。", mistakeReminder: "离页后完成的提醒。",
      sourceRevisions: [{ cardId: "series", revision: 1 }], warnings: [],
    });
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));

    expect(await screen.findByText("离页后完成的核心方法。")).toBeInTheDocument();
    expect(screen.getByText("AI 草稿预览")).toBeInTheDocument();
  });

  it("lets the user choose sources and enforces the generation minimum", () => {
    renderView();
    fireEvent.click(screen.getByRole("tab", { name: /复习题/ }));
    expect(screen.getByRole("heading", { name: "错因复习" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /两个电阻串联/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AI 生成复习题" }));
    expect(screen.getByRole("checkbox", { name: /两个电阻串联/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.change(screen.getByRole("spinbutton", { name: "生成卡片数" }), { target: { value: "0" } });
    expect(screen.getByRole("spinbutton", { name: "生成卡片数" })).toHaveValue(1);
    expect(screen.getByRole("button", { name: /AI 生成并保存 1 张/ })).toBeEnabled();
  });

  it("disables review outside a concrete knowledge point", () => {
    const container = renderView({ ...selection, key: "物理/电学", label: "电学", point: undefined });
    expect(screen.getByRole("tab", { name: /复习题/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));
    expect(container.querySelector(".knowledge-card-preview")).toHaveClass("math-content");
  });
});
