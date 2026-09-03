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
    state = agentReducer(state, { type: "event", runId, event: {
      type: "approval_resolved", approvalId: "approval-2", approved: false,
    } });

    expect(state[0]).toMatchObject({ status: "completed", approval: { status: "rejected" } });
  });

  it("keeps an approved run active until continuation finishes", () => {
    const runId = "run-3";
    let state = agentReducer([], { type: "event", runId, event: {
      type: "approval_required", approval: {
        approvalId: "approval-3", callId: "call-3", toolName: "cards.update",
        title: "待拆分卡片", impact: "更新第一张卡片",
      },
    } });
    state = agentReducer(state, { type: "event", runId, event: {
      type: "approval_resolved", approvalId: "approval-3", approved: true,
    } });

    expect(state[0]).toMatchObject({
      status: "running", label: "写操作已完成，继续任务", approval: { status: "approved" },
    });
  });
});
