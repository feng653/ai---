import { describe, expect, it } from "vitest";
import { agentReducer, welcomeItem } from "./agentReducer";

describe("agentReducer", () => {
  it("records an observable tool run and write approval", () => {
    const runId = "run-1";
    let state = [welcomeItem()];
    state = agentReducer(state, { type: "event", runId, event: {
      type: "tool_started", callId: "call-1", name: "cards.search", summary: "函数",
    } });
    state = agentReducer(state, { type: "event", runId, event: {
      type: "tool_completed", callId: "call-1", name: "cards.search", summary: "命中 1 张卡片",
    } });
    state = agentReducer(state, { type: "event", runId, event: {
      type: "approval_required", approval: {
        approvalId: "approval-1", callId: "call-2", toolName: "cards.update",
        title: "函数单调性", impact: "更新解题过程",
      },
    } });

    const run = state.find((item) => item.kind === "run");
    expect(run).toMatchObject({
      kind: "run", status: "waiting_approval",
      tools: [{ name: "cards.search", status: "completed" }],
      approval: { approvalId: "approval-1", status: "pending" },
    });
  });

  it("marks rejected writes without changing the conversation contract", () => {
    const runId = "run-2";
    let state = agentReducer([], { type: "event", runId, event: {
      type: "approval_required", approval: {
        approvalId: "approval-2", callId: "call-2", toolName: "cards.delete",
        title: "待删除卡片", impact: "删除整张卡片",
      },
    } });
    state = agentReducer(state, { type: "approval", result: {
      runId, approved: false, message: "已拒绝操作，没有修改数据。",
    } });

    expect(state[0]).toMatchObject({ status: "completed", approval: { status: "rejected" } });
    expect(state[1]).toMatchObject({ kind: "message", text: "已拒绝操作，没有修改数据。" });
  });
});
