import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { KnowledgeContextView } from "./KnowledgeContextView";

afterEach(cleanup);

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
    renderView({ ...selection, key: "物理/电学", label: "电学", point: undefined });
    expect(screen.getByRole("tab", { name: /复习题/ })).toBeDisabled();
  });
});
