import { Bot, FlaskConical, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
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

const suggestions = ["根据图片创建一张错题卡片", "修改导数卡片的错误原因"];

export function AgentDemoPage() {
  const [cards, setCards] = useState(() => structuredClone(initialDemoCards));
  const [messages, setMessages] = useState(() => structuredClone(initialDemoMessages));
  const [proposals, setProposals] = useState<DemoProposal[]>([]);
  const [thinking, setThinking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const send = (text: string, attachments: DemoAttachment[]) => {
    const userMessage: DemoMessage = {
      id: demoId("message"), role: "user", text: text || "请分析这些图片并创建卡片。", attachments,
    };
    setMessages((items) => [...items, userMessage]);
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      const proposal = buildDemoProposal(text, attachments);
      setProposals((items) => [...items, proposal]);
      setMessages((items) => [...items, {
        id: demoId("message"),
        role: "agent",
        text: proposal.kind === "create"
          ? "我已读取输入并整理出一张新卡片。请先审阅下面的字段，再决定是否创建。"
          : "我找到了“导数与单调区间”卡片，并准备了修改内容。确认前不会更改卡片。",
        proposalId: proposal.id,
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
        ? `操作已完成：${proposal.kind === "create" ? "Demo 卡片已创建" : "Demo 卡片已更新"}。`
        : "已拒绝这次操作，没有修改任何 Demo 卡片。",
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
    <div className="agent-demo-page">
      <header className="agent-demo-heading">
        <div><span className="demo-eyebrow"><FlaskConical size={13} />交互原型</span><h1>AI Agent 对话</h1><p>通过对话和图片创建、查找、修改错题卡片。</p></div>
        <div className="demo-safety"><ShieldCheck size={17} /><span><strong>确认后执行</strong><small>Demo 不写入正式数据库</small></span></div>
        <button className="button" type="button" onClick={reset}><RotateCcw size={16} />重置 Demo</button>
      </header>

      <div className="agent-demo-layout">
        <section className="agent-chat-panel">
          <header><span><Bot size={18} /></span><div><strong>知拾 Agent</strong><small><i />Demo 模式 · 模拟响应</small></div></header>
          <div className="agent-conversation">
            {messages.map((message) => <AgentMessage
              key={message.id}
              message={message}
              proposal={proposals.find((item) => item.id === message.proposalId)}
              onApply={(id) => resolveProposal(id, "applied")}
              onReject={(id) => resolveProposal(id, "rejected")}
            />)}
            {thinking && <div className="agent-thinking"><Sparkles size={15} /><span /><span /><span />Agent 正在分析输入和规划操作…</div>}
            <div ref={endRef} />
          </div>
          {messages.length === 1 && <div className="agent-suggestions">
            {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion, [])}>{suggestion}</button>)}
          </div>}
          <AgentComposer busy={thinking} onSend={send} />
        </section>
        <DemoCardLibrary cards={cards} />
      </div>
    </div>
  );
}
