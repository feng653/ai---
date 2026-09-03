import type {
  AgentApprovalResult, AgentEvent, AgentRunActivity, AgentTimelineItem,
} from "../../domain/agent";

export const welcomeItem = (): AgentTimelineItem => ({
  id: "welcome",
  kind: "message",
  role: "agent",
  text: "我可以直接聊天，也可以搜索、读取卡片，并在你批准后创建、修改或删除内容。",
});

export type TimelineAction =
  | { type: "user"; item: AgentTimelineItem }
  | { type: "event"; runId: string; event: AgentEvent }
  | { type: "approval"; result: AgentApprovalResult }
  | { type: "error"; text: string }
  | { type: "cancelled"; runId: string }
  | { type: "reset" };

function createRun(runId: string): AgentRunActivity {
  return {
    id: `run-${runId}`,
    kind: "run",
    runId,
    status: "running",
    label: "正在启动 Agent run",
    summaries: [],
    tools: [],
  };
}

function updateRun(
  items: AgentTimelineItem[],
  runId: string,
  update: (run: AgentRunActivity) => AgentRunActivity,
) {
  const index = items.findIndex((item) => item.kind === "run" && item.runId === runId);
  if (index < 0) return [...items, update(createRun(runId))];
  return items.map((item, itemIndex) => itemIndex === index ? update(item as AgentRunActivity) : item);
}

function applyEvent(items: AgentTimelineItem[], runId: string, event: AgentEvent) {
  if (event.type === "message") {
    return [...items, {
      id: `message-${crypto.randomUUID()}`,
      kind: "message" as const,
      role: "agent" as const,
      text: event.text,
    }];
  }
  return updateRun(items, runId, (run) => {
    if (event.type === "status") return { ...run, label: event.label, status: "running" };
    if (event.type === "decision_summary") {
      return { ...run, summaries: [...run.summaries, event.text] };
    }
    if (event.type === "tool_started") {
      return { ...run, label: `正在调用 ${event.name}`, tools: [...run.tools, {
        callId: event.callId, name: event.name, summary: event.summary, status: "running",
      }] };
    }
    if (event.type === "tool_completed") {
      return { ...run, tools: run.tools.map((tool) => tool.callId === event.callId
        ? { ...tool, summary: event.summary, status: "completed" } : tool) };
    }
    if (event.type === "approval_required") {
      return { ...run, label: "等待批准", status: "waiting_approval", approval: {
        ...event.approval, status: "pending",
      } };
    }
    if (event.type === "run_completed") return { ...run, status: event.status, label: statusLabel(event.status) };
    return run;
  });
}

function statusLabel(status: AgentRunActivity["status"]) {
  if (status === "completed") return "Agent run 已完成";
  if (status === "cancelled") return "运行已停止";
  if (status === "limit_reached") return "已达到步骤上限";
  if (status === "waiting_approval") return "等待批准";
  return "运行中";
}

export function agentReducer(items: AgentTimelineItem[], action: TimelineAction): AgentTimelineItem[] {
  if (action.type === "reset") return [welcomeItem()];
  if (action.type === "user") return [...items, action.item];
  if (action.type === "event") return applyEvent(items, action.runId, action.event);
  if (action.type === "cancelled") {
    return updateRun(items, action.runId, (run) => ({ ...run, status: "cancelled", label: "运行已停止" }));
  }
  if (action.type === "error") return [...items, {
    id: `message-${crypto.randomUUID()}`, kind: "message", role: "agent", text: action.text,
  }];
  const next = updateRun(items, action.result.runId, (run) => ({
    ...run,
    label: action.result.approved ? "写操作已完成" : "写操作已拒绝",
    status: "completed",
    approval: run.approval ? {
      ...run.approval, status: action.result.approved ? "approved" : "rejected",
    } : undefined,
  }));
  return [...next, {
    id: `message-${crypto.randomUUID()}`, kind: "message", role: "agent",
    text: action.result.message,
  }];
}
