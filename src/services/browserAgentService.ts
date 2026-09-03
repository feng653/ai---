import type {
  AgentApproval, AgentApprovalResult, AgentEvent, AgentEventPayload, AgentRunResult,
  AgentStartTurnRequest, AgentToolManifest,
} from "../domain/agent";
import { emptyCardInput, type Card } from "../domain/card";
import { cardService } from "./cardService";
import type { AgentService } from "./agentService";

type Pending = { request: AgentStartTurnRequest; approval: AgentApproval; card?: Card; action: "create" | "update" | "delete" };

const tools: AgentToolManifest[] = [
  ["cards.search", "搜索错题卡片", false],
  ["cards.get", "读取卡片详情", false],
  ["knowledge.search", "搜索已有知识点", false],
  ["cards.create", "创建一张卡片", true],
  ["cards.update", "更新指定卡片字段", true],
  ["cards.delete", "删除指定卡片", true],
].map(([name, description, sideEffect]) => ({
  name: String(name), description: String(description), sideEffect: Boolean(sideEffect),
  approvalRequired: Boolean(sideEffect),
}));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const cancelled = () => new Error("BROWSER_AGENT_CANCELLED");

export class BrowserAgentService implements AgentService {
  readonly preview = true;
  private pending = new Map<string, Pending>();
  private cancelled = new Set<string>();

  async listTools() { return tools; }

  async startTurn(request: AgentStartTurnRequest, onEvent: (payload: AgentEventPayload) => void) {
    let sequence = 0;
    const emit = async (event: AgentEvent, delay = 260) => {
      await wait(delay);
      if (this.cancelled.has(request.runId)) throw cancelled();
      onEvent({ requestId: "browser-preview", runId: request.runId, sequence: ++sequence, event });
    };
    const finish = async (message: string): Promise<AgentRunResult> => {
      await emit({ type: "message", text: message }, 320);
      await emit({ type: "run_completed", status: "completed" }, 80);
      return { runId: request.runId, status: "completed", message };
    };
    await emit({ type: "status", label: `${request.reasoningEffort} 推理 · 正在判断是否需要工具` }, 120);
    const intent = this.intent(request.message);
    if (request.mode === "chat_only" && intent !== "chat") {
      await emit({ type: "decision_summary", text: "本轮策略禁止工具调用，因此只说明能力边界。" });
      return finish("当前是“仅聊天”模式。我可以讨论这个任务，但不会读取或修改卡片。切换到“自动”后再发送即可执行。");
    }
    if (intent === "chat") {
      await emit({ type: "decision_summary", text: "这个问题可以直接回答，不需要调用工具。" });
      return finish(this.chatReply(request.message));
    }
    const cards = await cardService.list();
    const card = request.references.map((id) => cards.find((item) => item.id === id)).find(Boolean)
      ?? cards.find((item) => request.message.includes(item.knowledgePoints[0]?.name ?? "__none__"))
      ?? cards[0];
    await emit({ type: "decision_summary", text: "先搜索并读取当前卡片，再根据真实结果继续。" });
    const searchId = crypto.randomUUID();
    await emit({ type: "tool_started", callId: searchId, name: "cards.search", summary: request.message });
    await emit({ type: "tool_completed", callId: searchId, name: "cards.search", summary: `命中 ${card ? 1 : 0} 张卡片` }, 360);
    if (!card && intent !== "create") return finish("没有找到匹配卡片，我没有编造结果。你可以换一个关键词。");
    if (intent === "create") return this.requestApproval(request, onEvent, sequence, "create");
    const getId = crypto.randomUUID();
    await emit({ type: "tool_started", callId: getId, name: "cards.get", summary: card!.id });
    await emit({ type: "tool_completed", callId: getId, name: "cards.get", summary: `已读取 revision ${card!.revision}` }, 340);
    if (intent === "search") {
      return finish(`找到《${card!.question}》。\n\n主要错因：${card!.errorReason || "尚未记录"}`);
    }
    return this.requestApproval(request, onEvent, sequence, intent, card);
  }

  async cancel(runId: string) { this.cancelled.add(runId); }

  async resolveApproval(approvalId: string, approved: boolean): Promise<AgentApprovalResult> {
    const pending = this.pending.get(approvalId);
    if (!pending) throw new Error("批准请求不存在或已处理");
    this.pending.delete(approvalId);
    if (!approved) return { runId: pending.request.runId, approved, message: "已拒绝操作，没有修改数据。" };
    if (pending.action === "delete") {
      await cardService.delete(pending.card!.id);
      return { runId: pending.request.runId, approved, message: "卡片已删除。", deletedCardId: pending.card!.id };
    }
    if (pending.action === "update") {
      const card = pending.card!;
      const saved = await cardService.save({ id: card.id, expectedRevision: card.revision, input: {
        ...card, solution: "先明确研究区间，再结合关键条件分步骤推导并检查边界。",
      } });
      return { runId: pending.request.runId, approved, message: `卡片已更新到 revision ${saved.revision}。`, card: saved };
    }
    const input = emptyCardInput();
    input.question = pending.request.message.replace(/^.*?[:：]/, "").trim() || pending.request.message;
    input.assets = pending.request.assets;
    const saved = await cardService.save({ input });
    return { runId: pending.request.runId, approved, message: "卡片已创建。", card: saved };
  }

  private async requestApproval(
    request: AgentStartTurnRequest,
    onEvent: (payload: AgentEventPayload) => void,
    sequence: number,
    action: "create" | "update" | "delete",
    card?: Card,
  ): Promise<AgentRunResult> {
    const toolName = `cards.${action}`;
    const approval: AgentApproval = {
      approvalId: crypto.randomUUID(), callId: crypto.randomUUID(), toolName,
      title: card?.question || "创建新卡片",
      impact: action === "delete" ? "删除整张卡片及关联内容" : action === "update" ? "仅更新解题过程" : "创建一张新卡片",
    };
    this.pending.set(approval.approvalId, { request, approval, card, action });
    onEvent({ requestId: "browser-preview", runId: request.runId, sequence: sequence + 1, event: { type: "approval_required", approval } });
    return { runId: request.runId, status: "waiting_approval", message: "等待用户批准", approval };
  }

  private intent(text: string): "chat" | "search" | "create" | "update" | "delete" {
    if (/删除|移除/.test(text)) return "delete";
    if (/创建|新增|生成.*卡片/.test(text)) return "create";
    if (/修改|更新|改成|补充/.test(text)) return "update";
    if (/查找|搜索|找出|总结.*错题/.test(text)) return "search";
    return "chat";
  }

  private chatReply(text: string) {
    if (/你好|能做什么|介绍/.test(text)) return "你好，我可以直接聊天，也可以搜索、读取卡片，并在你批准后创建、修改或删除内容。";
    return `我理解你的问题是：“${text}”。这是浏览器预览回答；桌面应用会使用你选择的真实 AI Provider。`;
  }
}
