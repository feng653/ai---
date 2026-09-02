import { Check, FileEdit, FilePlus2, X } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { DemoProposal } from "./types";

type Props = {
  proposal: DemoProposal;
  onApply: () => void;
  onReject: () => void;
};

export function AgentProposalCard({ proposal, onApply, onReject }: Props) {
  const completed = proposal.status !== "pending";
  return (
    <section className={`agent-proposal ${proposal.status}`}>
      <header>
        <span>{proposal.kind === "create" ? <FilePlus2 size={17} /> : <FileEdit size={17} />}</span>
        <div><strong>{proposal.kind === "create" ? "创建卡片提案" : "修改卡片提案"}</strong><small>确认后才会执行</small></div>
        {completed && <em>{proposal.status === "applied" ? "已执行" : "已拒绝"}</em>}
      </header>
      <div className="agent-proposal-fields">
        {proposal.changes.map((change) => <div key={change.label}>
          <small>{change.label}</small><MathContent>{change.value}</MathContent>
        </div>)}
      </div>
      {!completed && <footer>
        <button type="button" onClick={onReject}><X size={15} />拒绝</button>
        <button className="confirm" type="button" onClick={onApply}><Check size={15} />确认执行</button>
      </footer>}
    </section>
  );
}
