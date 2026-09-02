import { Bot, UserRound } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { AgentMessage as AgentMessageType, AgentProposal } from "./types";
import { AgentProposalCard } from "./AgentProposalCard";

type Props = {
  message: AgentMessageType;
  proposal?: AgentProposal;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
};

export function AgentMessage({ message, proposal, onApply, onReject }: Props) {
  return (
    <article className={`agent-message ${message.role}`}>
      <span className="agent-avatar">{message.role === "agent" ? <Bot size={17} /> : <UserRound size={17} />}</span>
      <div className="agent-message-body">
        <small>{message.role === "agent" ? "知拾 Agent" : "你"}</small>
        {message.attachments?.length ? <div className="message-images">{message.attachments.map((image) =>
          <img key={image.id} src={image.previewUrl} alt={image.name} />)}</div> : null}
        <MathContent>{message.text}</MathContent>
        {proposal && <AgentProposalCard proposal={proposal} onApply={() => onApply(proposal.id)} onReject={() => onReject(proposal.id)} />}
      </div>
    </article>
  );
}
