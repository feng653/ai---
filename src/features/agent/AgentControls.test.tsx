import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentControls } from "./AgentControls";

describe("AgentControls", () => {
  afterEach(cleanup);

  it("exposes chat/tool modes, reasoning effort, and tool permissions", () => {
    const changeMode = vi.fn();
    const changeReasoning = vi.fn();
    render(<AgentControls mode="auto" reasoning="medium" busy={false}
      onModeChange={changeMode} onReasoningChange={changeReasoning} tools={[
        { name: "cards.search", description: "搜索卡片", sideEffect: false, approvalRequired: false },
        { name: "cards.update", description: "更新卡片", sideEffect: true, approvalRequired: true },
      ]} />);

    fireEvent.click(screen.getByRole("button", { name: "仅聊天" }));
    fireEvent.change(screen.getByRole("combobox", { name: "思考强度" }), { target: { value: "high" } });
    fireEvent.click(screen.getByText("可用工具", { exact: false }));

    expect(changeMode).toHaveBeenCalledWith("chat_only");
    expect(changeReasoning).toHaveBeenCalledWith("high");
    expect(screen.getByText("cards.search")).toBeInTheDocument();
    expect(screen.getByText("需批准")).toBeInTheDocument();
  });
});
