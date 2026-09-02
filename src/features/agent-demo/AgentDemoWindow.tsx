import { Bot, FlaskConical, Minus, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AgentComposer } from "./AgentComposer";
import { AgentMessage } from "./AgentMessage";
import { DemoCardLibrary } from "./DemoCardLibrary";
import {
  applyDemoProposal,
  buildDemoProposal,
  demoId,
  initialDemoCards,
  initialDemoMessages,
} from "./demoAgent";
import type { DemoAttachment, DemoMessage, DemoProposal } from "./types";

const suggestions = ["根据图片创建卡片", "修改导数卡片的错因"];

export function AgentDemoWindow() {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState(() => structuredClone(initialDemoCards));
  const [messages, setMessages] = useState(() => structuredClone(initialDemoMessages));
  const [proposals, setProposals] = useState<DemoProposal[]>([]);
  const [thinking, setThinking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open, thinking]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const send = (text: string, attachments: DemoAttachment[]) => {
    const userMessage: DemoMessage = {
      id: demoId("message"), role: "user", text: text || "请分析这些图片并创建卡片。", attachments,
    };
    setMessages((items) => [...items, userMessage]);
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      const proposal = buildDemoProposal(text, attachments, cards);
      setProposals((items) => [...items, proposal]);
      setMessages((items) => [...items, {
        id: demoId("message"), role: "agent", proposalId: proposal.id,
        text: proposal.kind === "create"
          ? "我整理出一张新卡片，请审阅后确认创建。"
          : `我找到了“${proposal.changes[0]?.value}”，请确认下面的修改。`,
      }]);
      setThinking(false);
      timerRef.current = null;
    }, 650);
  };

  const resolveProposal = (id: string, status: "applied" | "rejected") => {
    const proposal = proposals.find((item) => item.id === id);
    if (!proposal || proposal.status !== "pending") return;
    if (status === "applied") setCards((items) => applyDemoProposal(items, proposal));
    setProposals((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    setMessages((items) => [...items, {
      id: demoId("message"), role: "agent",
      text: status === "applied"
        ? `已完成：${proposal.kind === "create" ? "Demo 卡片已创建" : "Demo 卡片已更新"}。`
        : "已拒绝，没有修改任何 Demo 卡片。",
    }]);
  };

  const reset = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setCards(structuredClone(initialDemoCards));
    setMessages(structuredClone(initialDemoMessages));
    setProposals([]);
    setThinking(false);
  };

  return (
    <div className={`agent-float${open ? " open" : ""}`}>
      {open && <section className="agent-window" role="dialog" aria-label="AI Agent Demo">
        <header className="agent-window-header">
          <span className="agent-window-icon"><Bot size={18} /></span>
          <div><strong>知拾 Agent</strong><small><i />Demo 模式 · 模拟响应</small></div>
          <span className="agent-demo-tag"><FlaskConical size={12} />演示</span>
          <button type="button" title="重置 Demo" aria-label="重置 Demo" onClick={reset}><RotateCcw size={15} /></button>
          <button type="button" title="收起" aria-label="收起 AI Agent" onClick={() => setOpen(false)}><Minus size={17} /></button>
        </header>
        <div className="agent-window-safety"><ShieldCheck size={14} />创建和修改均需确认，不写入正式数据库</div>
        <DemoCardLibrary cards={cards} />
        <div className="agent-conversation">
          {messages.map((message) => <AgentMessage
            key={message.id}
            message={message}
            proposal={proposals.find((item) => item.id === message.proposalId)}
            onApply={(id) => resolveProposal(id, "applied")}
            onReject={(id) => resolveProposal(id, "rejected")}
          />)}
          {thinking && <div className="agent-thinking"><Sparkles size={15} /><span /><span /><span />正在分析并规划操作…</div>}
          <div ref={endRef} />
        </div>
        {messages.length === 1 && <div className="agent-suggestions">
          {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion, [])}>{suggestion}</button>)}
        </div>}
        <AgentComposer busy={thinking} cards={cards} onSend={send} />
      </section>}
      <button className="agent-fab" type="button" aria-label="打开 AI Agent Demo" onClick={() => setOpen((value) => !value)}>
        <span><Bot size={21} /></span><strong>AI Agent</strong><small>Demo</small>
      </button>
    </div>
  );
}
