import { useEffect, useReducer, useRef, useState } from "react";
import type {
  AgentMode, AgentReasoningEffort, AgentTimelineItem, AgentToolManifest,
} from "../../domain/agent";
import type { CardAsset } from "../../domain/card";
import { useCards } from "../../hooks/useCards";
import { agentService } from "../../services/agentService";
import { cardService } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";
import type { AgentAttachment } from "../agent-demo/types";
import { agentReducer, welcomeItem } from "./agentReducer";

export function useAgentHarness() {
  const [items, dispatch] = useReducer(agentReducer, [welcomeItem()]);
  const [mode, setMode] = useState<AgentMode>("auto");
  const [reasoning, setReasoning] = useState<AgentReasoningEffort>("medium");
  const [tools, setTools] = useState<AgentToolManifest[]>([]);
  const [activeRunId, setActiveRunId] = useState<string>();
  const cancelledRuns = useRef(new Set<string>());
  const cardsQuery = useCards();

  useEffect(() => {
    void agentService.listTools().then(setTools).catch(() => setTools([]));
  }, []);

  async function send(text: string, attachments: AgentAttachment[], references: string[]) {
    const message = text.trim() || "请根据图片创建一张错题卡片";
    if (activeRunId) return;
    if (/创建.*新对话|新建.*对话|开始新对话/.test(message)) {
      dispatch({ type: "error", text: "新对话只能通过标题栏的“新对话”按钮手动创建。" });
      return;
    }
    const assets: CardAsset[] = [];
    const runId = crypto.randomUUID();
    try {
      for (const attachment of attachments) assets.push(await cardService.importAsset(attachment.file));
      dispatch({ type: "user", item: {
        id: `message-${crypto.randomUUID()}`,
        kind: "message",
        role: "user",
        text: message,
        attachments: attachments.map((item) => ({ name: item.name, previewUrl: item.previewUrl })),
      } });
      setActiveRunId(runId);
      const history = items.filter((item): item is Extract<AgentTimelineItem, { kind: "message" }> => item.kind === "message")
        .slice(-12).map((item) => `${item.role === "user" ? "用户" : "Agent"}：${item.text}`);
      await agentService.startTurn({
        runId, message, history, references, assets, mode, reasoningEffort: reasoning,
      }, (payload) => dispatch({ type: "event", runId: payload.runId, event: payload.event }));
    } catch (reason) {
      if (!cancelledRuns.current.has(runId)) {
        dispatch({ type: "error", text: errorMessage(reason, "Agent 执行失败") });
      }
      await Promise.allSettled(assets.map((asset) => cardService.deleteAsset(asset.id)));
    } finally {
      cancelledRuns.current.delete(runId);
      setActiveRunId(undefined);
    }
  }

  async function cancel() {
    if (!activeRunId) return;
    const runId = activeRunId;
    cancelledRuns.current.add(runId);
    dispatch({ type: "cancelled", runId });
    await agentService.cancel(runId);
    setActiveRunId(undefined);
  }

  async function resolveApproval(approvalId: string, approved: boolean) {
    if (activeRunId) return;
    const run = items.find((item) => item.kind === "run" && item.approval?.approvalId === approvalId);
    if (!run || run.kind !== "run") return;
    setActiveRunId(run.runId);
    try {
      await agentService.resolveApproval(approvalId, approved, (payload) => {
        dispatch({ type: "event", runId: payload.runId, event: payload.event });
      });
      await cardsQuery.refetch();
    } catch (reason) {
      dispatch({ type: "error", text: errorMessage(reason, "批准操作处理失败") });
    } finally {
      setActiveRunId(undefined);
    }
  }

  async function newConversation() {
    if (activeRunId) await cancel();
    const pending = items.flatMap((item) => item.kind === "run" && item.approval?.status === "pending"
      ? [item.approval.approvalId] : []);
    await Promise.allSettled(pending.map((id) => agentService.resolveApproval(id, false, () => {})));
    dispatch({ type: "reset" });
  }

  return {
    items, mode, setMode, reasoning, setReasoning, tools,
    cards: cardsQuery.data ?? [], cardsLoading: cardsQuery.isLoading,
    busy: Boolean(activeRunId), preview: agentService.preview,
    provider: agentService.preview ? undefined : "项目内 API Runtime",
    send, cancel, resolveApproval, newConversation,
  };
}
