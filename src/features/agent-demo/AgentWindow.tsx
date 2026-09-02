import { Bot, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { validateCardInput } from "../../domain/card";
import { useAiStatus, useConnectAi } from "../../hooks/useAi";
import { useCards, useSaveCard } from "../../hooks/useCards";
import { aiService, type AiProgress } from "../../services/aiService";
import { cardService } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";
import { AgentComposer } from "./AgentComposer";
import { AgentMessage } from "./AgentMessage";
import { CardReferenceList } from "./CardReferenceList";
import { agentId, buildAgentProposal, prepareAgentInput } from "./agentWorkflow";
import type { AgentAttachment, AgentMessage as Message, AgentProposal } from "./types";

const welcome: Message = {
  id: "welcome",
  role: "agent",
  text: "我可以根据文字或图片创建卡片。需要修改已有卡片时，请先输入 @ 引用目标；执行前会给你确认。",
};

export function AgentWindow() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const cardsQuery = useCards();
  const saveCard = useSaveCard();
  const aiStatus = useAiStatus();
  const connectAi = useConnectAi();
  const cards = cardsQuery.data ?? [];
  const busy = Boolean(progress) || saveCard.isPending;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open, progress, proposals]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const addAgentMessage = (text: string, proposalId?: string) => setMessages((items) => [
    ...items, { id: agentId("message"), role: "agent", text, proposalId },
  ]);

  const removeAssets = async (ids: string[]) => {
    await Promise.allSettled(ids.map((id) => cardService.deleteAsset(id)));
  };

  const send = async (text: string, attachments: AgentAttachment[], referencedIds: string[]) => {
    setError("");
    setMessages((items) => [...items, {
      id: agentId("message"), role: "user", text: text || "请根据图片创建卡片。", attachments,
    }]);
    const imported = [];
    try {
      if (referencedIds.length > 1) throw new Error("一次只能修改一张引用卡片");
      const target = referencedIds[0] ? cards.find((card) => card.id === referencedIds[0]) : undefined;
      if (referencedIds[0] && !target) throw new Error("引用的卡片已不存在，请重新选择");
      let status = aiStatus.data;
      if (status?.state !== "connected") status = await connectAi.mutateAsync();
      if (status.state !== "connected") throw new Error(status.message || "Codex 当前不可用");
      setProgress({ stage: "preparing", message: "正在导入图片…" });
      for (const attachment of attachments) imported.push(await cardService.importAsset(attachment.file));
      const base = prepareAgentInput(target, imported);
      const instruction = text || "根据附图创建并整理一张数学错题卡片";
      const ai = await aiService.organize(base, target?.revision ?? 0, setProgress, instruction);
      const proposal = buildAgentProposal(ai, base, target, imported);
      setProposals((items) => [...items, proposal]);
      addAgentMessage(target
        ? `已生成“${proposal.targetLabel}”的修改提案，请核对后确认。`
        : "已生成新卡片提案，请核对后确认。", proposal.id);
    } catch (reason) {
      await removeAssets(imported.map((asset) => asset.id));
      const message = errorMessage(reason, "Agent 执行失败");
      setError(message);
      addAgentMessage(message);
    } finally {
      setProgress(null);
    }
  };

  const apply = async (id: string) => {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal || proposal.status !== "pending") return;
    const validation = validateCardInput(proposal.input);
    if (validation.length) {
      setProposals((items) => items.map((item) => item.id === id
        ? { ...item, status: "failed", error: validation.join("；") } : item));
      await removeAssets(proposal.newAssetIds);
      return;
    }
    setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "applying" } : item));
    try {
      const saved = await saveCard.mutateAsync({
        id: proposal.targetId, input: proposal.input, expectedRevision: proposal.expectedRevision,
      });
      setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "applied" } : item));
      addAgentMessage(`已保存卡片，当前版本为 ${saved.revision}。`);
    } catch (reason) {
      await removeAssets(proposal.newAssetIds);
      const message = errorMessage(reason, "卡片保存失败");
      setProposals((items) => items.map((item) => item.id === id
        ? { ...item, status: "failed", error: message } : item));
    }
  };

  const reject = async (id: string) => {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal || proposal.status !== "pending") return;
    await removeAssets(proposal.newAssetIds);
    setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "rejected" } : item));
    addAgentMessage("已拒绝提案，没有修改卡片。");
  };

  return (
    <div className={`agent-float${open ? " open" : ""}`}>
      {open && <section className="agent-window" role="dialog" aria-label="AI Agent">
        <header className="agent-window-header">
          <span className="agent-window-icon"><Bot size={18} /></span>
          <div><strong>知拾 Agent</strong><small><i />{aiStatus.data?.state === "connected" ? "Codex 已连接" : "需要连接 Codex"}</small></div>
          <button type="button" title="收起" aria-label="收起 AI Agent" onClick={() => setOpen(false)}><Minus size={17} /></button>
        </header>
        <div className="agent-window-safety"><ShieldCheck size={14} />AI 只生成提案，确认后才会写入卡片</div>
        <CardReferenceList cards={cards} loading={cardsQuery.isLoading} />
        <div className="agent-conversation">
          {messages.map((message) => <AgentMessage key={message.id} message={message}
            proposal={proposals.find((item) => item.id === message.proposalId)} onApply={apply} onReject={reject} />)}
          {progress && <div className="agent-thinking"><Sparkles size={15} /><span /><span /><span />{progress.message}</div>}
          {error && <div className="agent-window-error">{error}</div>}
          <div ref={endRef} />
        </div>
        <AgentComposer busy={busy} cards={cards} onSend={send} />
      </section>}
      <button className="agent-fab" type="button" aria-label="打开 AI Agent" onClick={() => setOpen((value) => !value)}>
        <span><Bot size={21} /></span><strong>AI Agent</strong>
      </button>
    </div>
  );
}
