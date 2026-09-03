import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { KnowledgeContextView } from "./KnowledgeContextView";
import { aiService } from "../../services/aiService";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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
  const result = render(<KnowledgeContextView allCards={[card]} cards={[card]} selection={activeSelection}
    loading={false} onSelectionChange={vi.fn()} onOpenCard={vi.fn()} onCreateCard={vi.fn()} />);
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
    fireEvent.click(screen.getByRole("button", { name: "AI 生成" }));

    await waitFor(() => expect(screen.getByText("串联电路的总电阻等于各分电阻之和。")).toBeInTheDocument());
    expect(screen.getByText("不要误用并联电阻公式。")).toBeInTheDocument();
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      topic: { subject: "物理", chapter: "电学", name: "串联电路" },
      sourceCards: [expect.objectContaining({ id: "series", revision: 1 })],
    }), expect.any(Function));
  });

  it("lets the user choose how many review questions are generated", () => {
    const container = renderView();
    fireEvent.click(screen.getByRole("tab", { name: /复习题/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "每次生成复习题数量" }), { target: { value: "5" } });
    expect(container.querySelectorAll(".review-questions > article")).toHaveLength(5);
    fireEvent.click(screen.getAllByRole("button", { name: "查看答案" })[0]);
    expect(screen.getByText("答案")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /标记掌握/ })[0]);
    expect(screen.getByText(/1\/5 已掌握/)).toBeInTheDocument();
  });

  it("disables review outside a concrete knowledge point", () => {
    const container = renderView({ ...selection, key: "物理/电学", label: "电学", point: undefined });
    expect(screen.getByRole("tab", { name: /复习题/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: /知识卡片/ }));
    expect(container.querySelector(".knowledge-card-preview")).toHaveClass("math-content");
  });
});
