import { Check, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MathContent } from "../../components/MathContent";
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
    <header><ShieldAlert size={15} /><div><strong>写操作需要批准</strong></div></header>
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
  if (run.approval) return <ApprovalCard run={run} onResolve={onResolve} />;
  if (["failed", "cancelled", "limit_reached"].includes(run.status)) {
    return <p className="harness-live">{run.label}</p>;
  }
  return null;
}

export function AgentTimeline({ items, busy, onResolve }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [items, busy]);
  return <div className="harness-timeline" aria-live="polite">
    {items.map((item) => item.kind === "message" ? <article className={`harness-message ${item.role}`} key={item.id}>
      <div>{item.attachments?.length ? <div className="harness-message-images">{item.attachments.map((asset) =>
        <img key={asset.previewUrl} src={asset.previewUrl} alt={asset.name} />)}</div> : null}
        <MathContent>{item.text}</MathContent></div>
    </article> : <RunItem key={item.id} run={item} onResolve={onResolve} />)}
    {busy && <div className="harness-live"><LoaderCircle className="spin" size={13} />处理中</div>}
    <div ref={endRef} />
  </div>;
}
