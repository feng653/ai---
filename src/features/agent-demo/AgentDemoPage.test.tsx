import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDemoPage } from "./AgentDemoPage";

describe("AgentDemoPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it("creates a demo card only after confirmation", () => {
    const { container } = render(<AgentDemoPage />);
    expect(container.querySelectorAll(".demo-card-list article")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "根据图片创建一张错题卡片" }));
    expect(container.querySelectorAll(".demo-card-list article")).toHaveLength(2);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(screen.getByRole("button", { name: "确认执行" }));

    expect(container.querySelectorAll(".demo-card-list article")).toHaveLength(3);
    expect(screen.getByText("操作已完成：Demo 卡片已创建。")).toBeInTheDocument();
  });
});
