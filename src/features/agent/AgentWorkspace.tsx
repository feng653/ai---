import { Bot, MessageSquarePlus, Minus, Octagon, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentComposer } from "../agent-demo/AgentComposer";
import { AgentControls } from "./AgentControls";
import { AgentTimeline } from "./AgentTimeline";
import { useAgentHarness } from "./useAgentHarness";

const suggestions = ["帮我找出函数相关错题", "总结我最近的主要错因", "创建卡片：证明函数单调性"];

export function AgentWorkspace() {
  const [open, setOpen] = useState(false);
  const [composerVersion, setComposerVersion] = useState(0);
  const harness = useAgentHarness();

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const newConversation = async () => {
    await harness.newConversation();
    setComposerVersion((value) => value + 1);
  };

  return <div className={`harness-float${open ? " open" : ""}`}>
    {open && <section className="harness-window" role="dialog" aria-label="知拾 Agent">
      <header className="harness-header">
        <span className="harness-logo"><Bot size={19} /></span>
        <div><strong>知拾 Agent</strong><small><i />{harness.preview
          ? "浏览器预览 · 本地模拟运行"
          : harness.provider ? `${harness.provider} · 桌面运行时` : "桌面运行时"}</small></div>
        <button title="新对话" aria-label="新对话" onClick={() => void newConversation()}>
          <MessageSquarePlus size={16} />
        </button>
        <button title="收起" aria-label="收起 AI Agent" onClick={() => setOpen(false)}><Minus size={17} /></button>
      </header>
      {harness.preview && <div className="harness-preview"><Sparkles size={13} />局域网页用于交互验收；真实 AI 与工具在桌面程序中运行</div>}
      <AgentControls mode={harness.mode} reasoning={harness.reasoning} tools={harness.tools}
        busy={harness.busy} onModeChange={harness.setMode} onReasoningChange={harness.setReasoning} />
      <AgentTimeline items={harness.items} busy={harness.busy} onResolve={(id, approved) =>
        void harness.resolveApproval(id, approved)} />
      <div className="harness-suggestions">{suggestions.map((text) =>
        <button key={text} disabled={harness.busy} onClick={() => void harness.send(text, [], [])}>{text}</button>)}</div>
      {harness.busy && <button className="harness-stop" onClick={() => void harness.cancel()}>
        <Octagon size={13} />停止本轮
      </button>}
      <AgentComposer key={composerVersion} busy={harness.busy} cards={harness.cards}
        onSend={(text, attachments, references) => void harness.send(text, attachments, references)} />
    </section>}
    <button className="harness-fab" type="button" aria-label={open ? "收起 AI Agent" : "打开 AI Agent"}
      onClick={() => setOpen((value) => !value)}><span><Bot size={21} /></span><strong>AI Agent</strong></button>
  </div>;
}
