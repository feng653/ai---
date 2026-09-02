import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiService } from "../../services/aiService";
import { AgentWindow } from "./AgentWindow";

const connect = vi.fn();
const save = vi.fn();

vi.mock("../../hooks/useCards", () => ({
  useCards: () => ({ data: [], isLoading: false }),
  useSaveCard: () => ({ mutateAsync: save, isPending: false }),
}));
vi.mock("../../hooks/useAi", () => ({
  useAiStatus: () => ({ data: { state: "connected", provider: "codex-cli", message: "ok" } }),
  useConnectAi: () => ({ mutateAsync: connect }),
}));
vi.mock("../../services/aiService", () => ({ aiService: { organize: vi.fn() } }));
vi.mock("../../services/cardService", () => ({
  cardService: { importAsset: vi.fn(), deleteAsset: vi.fn() },
}));

describe("AgentWindow", () => {
  beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
  afterEach(() => { cleanup(); vi.resetAllMocks(); });

  it("opens, starts a new conversation manually, and closes", async () => {
    render(<AgentWindow />);
    expect(screen.queryByRole("dialog", { name: "AI Agent" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "打开 AI Agent" }));
    expect(screen.getByRole("dialog", { name: "AI Agent" })).toBeInTheDocument();
    expect(screen.getByText("AI 只生成提案，确认后才会写入卡片")).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/描述要创建或修改/);
    fireEvent.change(input, { target: { value: "尚未发送的内容" } });
    fireEvent.click(screen.getByRole("button", { name: "新对话" }));
    await waitFor(() => expect(screen.getByPlaceholderText(/描述要创建或修改/)).toHaveValue(""));
    fireEvent.click(screen.getByRole("button", { name: "收起 AI Agent" }));
    expect(screen.queryByRole("dialog", { name: "AI Agent" })).toBeNull();
  });

  it("saves a real AI proposal only after confirmation", async () => {
    vi.mocked(aiService.organize).mockResolvedValue({
      runId: "run", baseRevision: 0, promptVersion: "v4", warnings: [],
      fields: { question: { value: "解方程 $x=1$", uncertain: false, source: "user_text" } },
    });
    save.mockResolvedValue({ revision: 1 });
    render(<AgentWindow />);
    fireEvent.click(screen.getByRole("button", { name: "打开 AI Agent" }));
    fireEvent.change(screen.getByPlaceholderText(/描述要创建或修改/), {
      target: { value: "创建卡片：解方程 x=1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(save).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "确认执行" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].input.question).toBe("解方程 $x=1$");
  });

  it("does not create a conversation from a chat command", async () => {
    render(<AgentWindow />);
    fireEvent.click(screen.getByRole("button", { name: "打开 AI Agent" }));
    fireEvent.change(screen.getByPlaceholderText(/描述要创建或修改/), {
      target: { value: "请创建一个新对话" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText(/新对话只能通过标题栏/)).toBeInTheDocument();
    expect(aiService.organize).not.toHaveBeenCalled();
  });

  it("continues editing the pending proposal across turns", async () => {
    vi.mocked(aiService.organize)
      .mockResolvedValueOnce({
        runId: "run-1", baseRevision: 0, promptVersion: "v4", warnings: [],
        fields: {
          question: { value: "解方程 $x=1$", uncertain: false, source: "user_text" },
          solution: { value: "这是一个较长的解题过程", uncertain: false, source: "inference" },
        },
      })
      .mockResolvedValueOnce({
        runId: "run-2", baseRevision: 0, promptVersion: "v4", warnings: [],
        fields: { solution: { value: "解得 $x=1$。", uncertain: false, source: "inference" } },
      });
    save.mockResolvedValue({ revision: 1, question: "解方程 $x=1$", knowledgePoints: [] });
    render(<AgentWindow />);
    fireEvent.click(screen.getByRole("button", { name: "打开 AI Agent" }));
    const input = screen.getByPlaceholderText(/描述要创建或修改/);
    fireEvent.change(input, { target: { value: "创建卡片：解方程 x=1" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await screen.findByRole("button", { name: "确认执行" });

    fireEvent.change(input, { target: { value: "解题过程再简短一点" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(aiService.organize).toHaveBeenCalledTimes(2));
    expect(screen.getByText("已被后续提案替代")).toBeInTheDocument();
    expect(vi.mocked(aiService.organize).mock.calls[1][0].question).toBe("解方程 $x=1$");
    expect(vi.mocked(aiService.organize).mock.calls[1][4]).toEqual(expect.arrayContaining([
      expect.stringContaining("创建卡片"),
    ]));

    fireEvent.click(screen.getByRole("button", { name: "确认执行" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].input.solution).toBe("解得 $x=1$。");
  });
});
