import { Bot, Globe2, MessageSquarePlus, Minus, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { validateCardInput, type Card, type CardAsset } from "../../domain/card";
import { useAiStatus, useConnectAi } from "../../hooks/useAi";
import { useCards, useSaveCard } from "../../hooks/useCards";
import { aiService, type AiProgress } from "../../services/aiService";
import { cardService } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";
import { AgentComposer } from "./AgentComposer";
import { AgentMessage } from "./AgentMessage";
import { CardReferenceList } from "./CardReferenceList";
import {
  agentCardProposals, agentId, agentTarget, buildAgentProposal, cardReferenceLabel,
  extendAgentInput, prepareAgentInput, type AgentTarget,
} from "./agentWorkflow";
import type { AgentAttachment, AgentMessage as Message, AgentProposal } from "./types";

const welcome: Message = {
  id: "welcome",
  role: "agent",
  text: "我可以直接回答问题，也可以根据文字或图片创建卡片。需要修改已有卡片时，请先输入 @ 引用目标；写入前会给你确认。",
};

type AgentContext = { proposalId?: string; card?: Card; label: string };

export function AgentWindow() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [error, setError] = useState("");
  const [context, setContext] = useState<AgentContext | null>(null);
  const [conversationVersion, setConversationVersion] = useState(0);
  const [webSearch, setWebSearch] = useState(false);
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

  const addAgentMessage = (text: string, proposalIds?: string[], sources?: Message["sources"]) => setMessages((items) => [
    ...items, { id: agentId("message"), role: "agent", text, proposalIds, sources },
  ]);

  const removeAssets = async (ids: string[]) => {
    await Promise.allSettled(ids.map((id) => cardService.deleteAsset(id)));
  };

  const send = async (text: string, attachments: AgentAttachment[], referencedIds: string[]) => {
    const history = messages.slice(-8).map((message) => `${message.role === "user" ? "用户" : "Agent"}：${message.text}`);
    setError("");
    setMessages((items) => [...items, {
      id: agentId("message"), role: "user", text: text || "请根据图片创建卡片。", attachments,
    }]);
    if (/创建.*新对话|新建.*对话|开始新对话/.test(text)) {
      addAgentMessage("新对话只能通过标题栏的“新对话”按钮手动创建。");
      return;
    }
    const imported: CardAsset[] = [];
    const ownedAssets: CardAsset[] = [];
    try {
      if (referencedIds.length > 1) throw new Error("一次只能修改一张引用卡片");
      const explicit = referencedIds[0] ? cards.find((card) => card.id === referencedIds[0]) : undefined;
      if (referencedIds[0] && !explicit) throw new Error("引用的卡片已不存在，请重新选择");
      const continueContext = !explicit;
      const previous = continueContext && context?.proposalId
        ? proposals.find((item) => item.id === context.proposalId && item.status === "pending") : undefined;
      const targetCard = explicit ?? (continueContext ? context?.card : undefined);
      const target: AgentTarget | undefined = targetCard ? agentTarget(targetCard)
        : previous?.targetId ? {
          id: previous.targetId, label: previous.targetLabel!, revision: previous.expectedRevision!,
        } : undefined;
      let status = aiStatus.data;
      if (status?.state !== "connected") status = await connectAi.mutateAsync();
      if (status.state !== "connected") throw new Error(status.message || "当前 AI 服务不可用");
      setProgress({ stage: "preparing", message: "正在导入图片…" });
      for (const attachment of attachments) {
        const asset = await cardService.importAsset(attachment.file);
        imported.push(asset);
        ownedAssets.push(asset);
      }
      const base = previous ? extendAgentInput(previous.input, imported) : prepareAgentInput(targetCard, imported);
      const request = text || "根据附图创建并整理一张数学错题卡片";
      const ai = await aiService.organize(
        base, target?.revision ?? 0, setProgress, request, history, Boolean(target), webSearch,
      );
      if (ai.action === "reply") {
        await removeAssets(ownedAssets.map((asset) => asset.id));
        addAgentMessage(ai.message, undefined, ai.sources);
        return;
      }
      const cardResults = agentCardProposals(ai);
      const assetGroups = [imported];
      for (let index = 1; index < cardResults.length; index += 1) {
        const group: CardAsset[] = [];
        for (const attachment of attachments) {
          const asset = await cardService.importAsset(attachment.file);
          group.push(asset);
          ownedAssets.push(asset);
        }
        assetGroups.push(group);
      }
      const chosenTarget = ai.action === "update_card" ? target : undefined;
      const continueCreate = cardResults.length === 1 && ai.action === "create_card" && previous?.kind === "create";
      const nextProposals = cardResults.map((result, index) => {
        const newAssets = assetGroups[index];
        const proposalBase = chosenTarget || continueCreate
          ? base : prepareAgentInput(undefined, newAssets);
        const inheritedAssets = chosenTarget || continueCreate ? previous?.newAssetIds : [];
        return buildAgentProposal(result, proposalBase, chosenTarget, newAssets, inheritedAssets);
      });
      setProposals((items) => [
        ...items.map((item) => item.id === previous?.id ? { ...item, status: "superseded" as const } : item),
        ...nextProposals,
      ]);
      const proposalIds = nextProposals.map((proposal) => proposal.id);
      setContext(nextProposals.length === 1
        ? { proposalId: proposalIds[0], label: chosenTarget?.label ?? "新卡片提案" }
        : null);
      addAgentMessage(ai.message || (chosenTarget
        ? `已生成“${nextProposals[0].targetLabel}”的修改提案，请核对后确认。`
        : `已生成 ${nextProposals.length} 张新卡片提案，请逐张核对后确认。`), proposalIds, ai.sources);
    } catch (reason) {
      await removeAssets(ownedAssets.map((asset) => asset.id));
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
      if (context?.proposalId === id) setContext(null);
      return;
    }
    setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "applying" } : item));
    try {
      const saved = await saveCard.mutateAsync({
        id: proposal.targetId, input: proposal.input, expectedRevision: proposal.expectedRevision,
      });
      setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "applied" } : item));
      setContext({ card: saved, label: cardReferenceLabel(saved) });
      addAgentMessage(`已保存卡片，当前版本为 ${saved.revision}。`);
    } catch (reason) {
      await removeAssets(proposal.newAssetIds);
      const message = errorMessage(reason, "卡片保存失败");
      setProposals((items) => items.map((item) => item.id === id
        ? { ...item, status: "failed", error: message } : item));
      if (context?.proposalId === id) setContext(null);
    }
  };

  const reject = async (id: string) => {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal || proposal.status !== "pending") return;
    await removeAssets(proposal.newAssetIds);
    setProposals((items) => items.map((item) => item.id === id ? { ...item, status: "rejected" } : item));
    if (context?.proposalId === id) setContext(null);
    addAgentMessage("已拒绝提案，没有修改卡片。");
  };

  const clearContext = () => {
    const pending = context?.proposalId
      ? proposals.find((item) => item.id === context.proposalId) : undefined;
    if (pending?.status === "pending") void reject(pending.id);
    else setContext(null);
  };

  const newConversation = async () => {
    const pending = proposals.filter((proposal) => proposal.status === "pending");
    if (pending.length && !window.confirm("新建对话会拒绝尚未确认的提案，是否继续？")) return;
    await removeAssets([...new Set(pending.flatMap((proposal) => proposal.newAssetIds))]);
    setMessages([welcome]);
    setProposals([]);
    setContext(null);
    setError("");
    setConversationVersion((value) => value + 1);
  };

  return (
    <div className={`agent-float${open ? " open" : ""}`}>
      {open && <section className="agent-window" role="dialog" aria-label="AI Agent">
        <header className="agent-window-header">
          <span className="agent-window-icon"><Bot size={18} /></span>
          <div><strong>知拾 Agent</strong><small><i />{aiStatus.data?.state === "connected"
            ? `${aiStatus.data.provider} 已连接` : "需要连接 AI 服务"}</small></div>
          <button type="button" title="新对话" aria-label="新对话" disabled={busy} onClick={() => void newConversation()}><MessageSquarePlus size={15} /></button>
          <button type="button" title="收起" aria-label="收起 AI Agent" onClick={() => setOpen(false)}><Minus size={17} /></button>
        </header>
        <div className="agent-window-safety"><ShieldCheck size={14} /><span>AI 可直接回答；卡片写入仍需你的确认</span>
          <label><Globe2 size={12} /><input type="checkbox" checked={webSearch} disabled={busy}
            onChange={(event) => setWebSearch(event.target.checked)} />联网搜索</label></div>
        <CardReferenceList cards={cards} loading={cardsQuery.isLoading} />
        <div className="agent-conversation">
          {messages.map((message) => <AgentMessage key={message.id} message={message}
            proposals={proposals.filter((item) => message.proposalIds?.includes(item.id))}
            onApply={apply} onReject={reject} />)}
          {progress && <div className="agent-thinking"><Sparkles size={15} /><span /><span /><span />{progress.message}</div>}
          {error && <div className="agent-window-error">{error}</div>}
          <div ref={endRef} />
        </div>
        {context && <div className="agent-context"><span>当前上下文：{context.label}</span>
          <button type="button" onClick={clearContext} aria-label="结束当前上下文"><X size={12} /></button></div>}
        <AgentComposer key={conversationVersion} busy={busy} cards={cards} onSend={send} />
      </section>}
      <button className="agent-fab" type="button" aria-label="打开 AI Agent" onClick={() => setOpen((value) => !value)}>
        <span><Bot size={21} /></span><strong>AI Agent</strong>
      </button>
    </div>
  );
}
