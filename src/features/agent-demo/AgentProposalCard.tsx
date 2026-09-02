import { Check, FileEdit, FilePlus2, X } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { AgentProposal } from "./types";

type Props = {
  proposal: AgentProposal;
  onApply: () => void;
  onReject: () => void;
};

export function AgentProposalCard({ proposal, onApply, onReject }: Props) {
  const completed = !["pending", "applying"].includes(proposal.status);
  return (
    <section className={`agent-proposal ${proposal.status}`}>
      <header>
        <span>{proposal.kind === "create" ? <FilePlus2 size={17} /> : <FileEdit size={17} />}</span>
        <div><strong>{proposal.kind === "create" ? "创建卡片提案" : "修改卡片提案"}</strong><small>确认后才会执行</small></div>
        {completed && <em>{proposal.status === "applied" ? "已执行" : proposal.status === "rejected" ? "已拒绝" : "执行失败"}</em>}
      </header>
      <div className="agent-proposal-fields">
        {proposal.changes.map((change) => <div key={change.label}>
          <small>{change.label}</small><MathContent>{change.value}</MathContent>
        </div>)}
      </div>
      {proposal.warnings.length > 0 && <div className="agent-proposal-warnings">
        {proposal.warnings.map((warning) => <small key={warning}>{warning}</small>)}
      </div>}
      {proposal.error && <div className="agent-proposal-error">{proposal.error}</div>}
      {!completed && <footer>
        <button type="button" onClick={onReject} disabled={proposal.status === "applying"}><X size={15} />拒绝</button>
        <button className="confirm" type="button" onClick={onApply} disabled={proposal.status === "applying"}>
          <Check size={15} />{proposal.status === "applying" ? "正在执行…" : "确认执行"}
        </button>
      </footer>}
    </section>
  );
}
