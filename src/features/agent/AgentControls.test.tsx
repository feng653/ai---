import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentControls } from "./AgentControls";

describe("AgentControls", () => {
  afterEach(cleanup);

  it("changes mode and reasoning without displaying tools", () => {
    const changeMode = vi.fn();
    const changeReasoning = vi.fn();
    render(<AgentControls mode="auto" reasoning="medium" busy={false}
      onModeChange={changeMode} onReasoningChange={changeReasoning} />);

    fireEvent.click(screen.getByRole("button", { name: "仅聊天" }));
    fireEvent.change(screen.getByRole("combobox", { name: "思考强度" }), { target: { value: "high" } });

    expect(changeMode).toHaveBeenCalledWith("chat_only");
    expect(changeReasoning).toHaveBeenCalledWith("high");
    expect(screen.queryByText("可用工具")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自动" })).toHaveAttribute("aria-pressed", "true");
  });
});
