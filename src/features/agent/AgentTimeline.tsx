import { Bot, Check, Circle, LoaderCircle, ShieldAlert, UserRound, Wrench, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AgentRunActivity, AgentTimelineItem } from "../../domain/agent";

type Props = {
  items: AgentTimelineItem[];
  busy: boolean;
  onResolve: (approvalId: string, approved: boolean) => void;
};

function ApprovalCard({ run, onResolve }: { run: AgentRunActivity; onResolve: Props["onResolve"] }) {
  const approval = run.approval;
  if (!approval) return null;
  const pending = approval.status === "pending";
  return <section className={`harness-approval ${approval.status}`}>
    <header><ShieldAlert size={15} /><div><strong>写操作需要批准</strong><small>{approval.toolName}</small></div></header>
    <p>{approval.title}</p>
    <small>影响：{approval.impact}</small>
    <footer>
      {pending ? <>
        <button onClick={() => onResolve(approval.approvalId, false)}><X size={13} />拒绝</button>
        <button className="approve" onClick={() => onResolve(approval.approvalId, true)}><Check size={13} />批准执行</button>
      </> : <span>{approval.status === "approved" ? "已批准并执行" : "已拒绝，未修改数据"}</span>}
    </footer>
  </section>;
}

function RunItem({ run, onResolve }: { run: AgentRunActivity; onResolve: Props["onResolve"] }) {
  return <article className={`harness-run ${run.status}`}>
    <header>{run.status === "running" ? <LoaderCircle className="spin" size={14} /> : <Circle size={12} />}
      <strong>{run.label}</strong><small>{run.status}</small></header>
    {run.summaries.map((summary, index) => <p key={`${summary}-${index}`}>{summary}</p>)}
    {run.tools.map((tool) => <div className="harness-tool-call" key={tool.callId}>
      <Wrench size={12} /><code>{tool.name}</code><span>{tool.summary}</span>
      {tool.status === "running" ? <LoaderCircle className="spin" size={12} /> : <Check size={12} />}
    </div>)}
    <ApprovalCard run={run} onResolve={onResolve} />
  </article>;
}

export function AgentTimeline({ items, busy, onResolve }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [items, busy]);
  return <div className="harness-timeline" aria-live="polite">
    {items.map((item) => item.kind === "message" ? <article className={`harness-message ${item.role}`} key={item.id}>
      <span>{item.role === "agent" ? <Bot size={14} /> : <UserRound size={14} />}</span>
      <div>{item.attachments?.length ? <div className="harness-message-images">{item.attachments.map((asset) =>
        <img key={asset.previewUrl} src={asset.previewUrl} alt={asset.name} />)}</div> : null}
        <p>{item.text}</p></div>
    </article> : <RunItem key={item.id} run={item} onResolve={onResolve} />)}
    {busy && <div className="harness-live"><LoaderCircle className="spin" size={13} />Agent 正在运行，可随时停止</div>}
    <div ref={endRef} />
  </div>;
}
