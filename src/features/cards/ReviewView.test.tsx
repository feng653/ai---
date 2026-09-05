import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Card } from "../../domain/card";
import { aiService } from "../../services/aiService";
import { cardService } from "../../services/cardService";
import { practiceGenerationRuns } from "./learningGenerationRun";
import { ReviewView } from "./ReviewView";

afterEach(() => {
  cleanup();
  practiceGenerationRuns.dismiss("practice-generator");
  vi.restoreAllMocks();
});

const source: Card = {
  id: "source", kind: "mistake", subject: "数学", question: "判断函数的单调性。", userAnswer: "直接求导",
  correctAnswer: "先确定定义域", supplementalNote: "", solution: "在定义域内分析导数符号。",
  errorLocation: "第一步", errorReason: "忽略定义域", errorType: "审题错误",
  knowledgePoints: [{ subject: "数学", chapter: "函数", name: "单调性" }], assets: [], status: "organized",
  revision: 2, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
};
const practice: Card = {
  ...source, id: "practice", kind: "practice", question: "新生成的单调性练习。", userAnswer: "",
  supplementalNote: "AI 根据来源错题生成 · 难度：更难", sourceRevisions: [{ cardId: "source", revision: 2 }],
};
const selection = {
  key: "数学/函数/单调性", label: "单调性", subject: "数学", chapter: "函数", point: "单调性",
};

function renderView(savedCards: Card[], onOpenCard = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ReviewView
    allCards={[source]} initialSelection={selection} savedCards={savedCards}
    onOpenCard={onOpenCard} />
  </QueryClientProvider>);
}

describe("ReviewView", () => {
  it("opens on saved cards and allows entering a card or the generator", () => {
    const onOpenCard = vi.fn();
    renderView([practice], onOpenCard);

    expect(screen.getByRole("heading", { name: "错因复习" })).toBeInTheDocument();
    expect(screen.queryByText("选择知识点范围")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /进入卡片/ }));
    expect(onOpenCard).toHaveBeenCalledWith("practice");
    fireEvent.click(screen.getByRole("button", { name: "AI 生成复习题" }));
    expect(screen.getByText("选择知识点范围")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "练习类型" })).toHaveValue("recall");
  });

  it("sends difficulty and real error evidence to AI before saving", async () => {
    vi.spyOn(aiService, "getStatus").mockResolvedValue({ state: "connected", provider: "codex", message: "ok" });
    const generate = vi.spyOn(aiService, "generatePracticeCards").mockResolvedValue([{
      input: {
        subject: "数学", question: practice.question, userAnswer: "", correctAnswer: "答案",
        supplementalNote: practice.supplementalNote, solution: "解析", errorLocation: "", errorReason: "",
        errorType: "", knowledgePoints: practice.knowledgePoints, assets: [],
      },
      sourceRevisions: practice.sourceRevisions!,
    }]);
    const save = vi.spyOn(cardService, "savePracticeCards").mockResolvedValue([practice]);
    renderView([]);
    fireEvent.click(screen.getByRole("button", { name: "AI 生成复习题" }));
    fireEvent.change(screen.getByRole("combobox", { name: "练习类型" }), { target: { value: "similar" } });
    fireEvent.click(screen.getByRole("button", { name: /更难/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /附加要求/ }), {
      target: { value: "加入参数讨论" },
    });
    fireEvent.click(screen.getByRole("button", { name: /AI 生成并保存 1 张/ }));

    await waitFor(() => expect(screen.getByText(practice.question)).toBeInTheDocument());
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      difficulty: "harder", count: 1, additionalRequirements: "加入参数讨论",
      sourceCards: [expect.objectContaining({ id: "source", revision: 2, errorReason: "忽略定义域" })],
    }), expect.any(Function));
    expect(save).toHaveBeenCalledOnce();
  });

  it("continues after unmount and restores automatically saved practice cards", async () => {
    let finish: ((value: Awaited<ReturnType<typeof aiService.generatePracticeCards>>) => void) | undefined;
    vi.spyOn(aiService, "getStatus").mockResolvedValue({ state: "connected", provider: "deepseek", message: "ok" });
    vi.spyOn(aiService, "generatePracticeCards").mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));
    const save = vi.spyOn(cardService, "savePracticeCards").mockResolvedValue([practice]);
    const first = renderView([]);
    fireEvent.click(screen.getByRole("button", { name: "AI 生成复习题" }));
    fireEvent.click(screen.getByRole("button", { name: /AI 生成并保存 1 张/ }));
    expect(screen.getByRole("status")).toHaveTextContent("AI 正在生成复习题");
    first.unmount();
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    finish?.([{
      input: {
        subject: "数学", question: practice.question, userAnswer: "", correctAnswer: "答案",
        supplementalNote: practice.supplementalNote, solution: "解析", errorLocation: "", errorReason: "",
        errorType: "", knowledgePoints: practice.knowledgePoints, assets: [],
      },
      sourceRevisions: practice.sourceRevisions!,
    }]);
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    renderView([]);

    expect(await screen.findByText(practice.question)).toBeInTheDocument();
  });
});
