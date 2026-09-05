import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AgentEvent, AgentTimelineItem } from "../../domain/agent";
import { agentReducer } from "./agentReducer";
import { AgentTimeline } from "./AgentTimeline";

afterEach(cleanup);

it("keeps commentary, approvals and replies in occurrence order across continuation", () => {
  Element.prototype.scrollIntoView = vi.fn();
  let items: AgentTimelineItem[] = [];
  const emit = (event: AgentEvent) => {
    items = agentReducer(items, { type: "event", runId: "run", event });
  };
  emit({ type: "status", label: "启动" });
  emit({ type: "decision_summary", text: "先查看原题" });
  emit({ type: "tool_started", callId: "read", name: "cards.get", summary: "内部参数" });
  emit({ type: "tool_completed", callId: "read", name: "cards.get", summary: "内部结果" });
  emit({ type: "decision_summary", text: "已找到需要修改的内容" });
  const approval = { approvalId: "a", callId: "write", toolName: "cards.update", title: "修改原题", impact: "更新答案" };
  emit({ type: "approval_required", approval });
  emit({ type: "approval_resolved", approvalId: "a", approved: true });
  emit({ type: "message", text: "**第一步完成**" });
  emit({ type: "decision_summary", text: "接着补充错因" });
  emit({ type: "approval_required", approval: { ...approval, approvalId: "b", title: "补充错因" } });
  const resolve = vi.fn();
  const { container } = render(<AgentTimeline items={items} busy={false} onResolve={resolve} />);
  const text = container.textContent!;
  const ordered = ["先查看原题", "已找到需要修改的内容", "修改原题", "第一步完成", "接着补充错因", "补充错因"];
  for (let index = 1; index < ordered.length; index++) {
    expect(text.lastIndexOf(ordered[index])).toBeGreaterThan(text.indexOf(ordered[index - 1]));
  }
  expect(container.querySelector("strong")?.textContent).toBe("写操作需要批准");
  expect(screen.getByText("第一步完成").tagName).toBe("STRONG");
  expect(text).not.toContain("cards.get");
  expect(text).not.toContain("内部结果");
  fireEvent.click(screen.getByRole("button", { name: "批准执行" }));
  expect(resolve).toHaveBeenCalledWith("b", true);
});
