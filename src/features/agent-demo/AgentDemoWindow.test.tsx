import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDemoWindow } from "./AgentDemoWindow";

describe("AgentDemoWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it("opens as a floating window and creates only after confirmation", () => {
    const { container } = render(<AgentDemoWindow />);
    expect(screen.queryByRole("dialog", { name: "AI Agent Demo" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "打开 AI Agent Demo" }));
    expect(screen.getByRole("dialog", { name: "AI Agent Demo" })).toBeInTheDocument();
    expect(container.querySelectorAll(".demo-card-list article")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "根据图片创建卡片" }));
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole("button", { name: "确认执行" }));
    expect(container.querySelectorAll(".demo-card-list article")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "收起 AI Agent" }));
    expect(screen.queryByRole("dialog", { name: "AI Agent Demo" })).toBeNull();
  });
});
