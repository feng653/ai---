import { CheckCircle2, Library, PencilLine } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { Card } from "../../domain/card";
import { cardReferenceLabel } from "./agentWorkflow";

type Props = { cards: Card[]; loading: boolean };

export function CardReferenceList({ cards, loading }: Props) {
  return (
    <details className="demo-card-library">
      <summary>
        <Library size={14} /><strong>可引用卡片</strong>
        <small>{loading ? "正在读取…" : "输入 @ 引用"}</small><span>{cards.length}</span>
      </summary>
      <div className="demo-card-list">
        {cards.slice(0, 20).map((card) => <article key={card.id}>
          <div><span>{card.subject}</span><em className={card.status}>{card.status === "organized" ? "已整理" : "草稿"}</em></div>
          <strong>{cardReferenceLabel(card)}</strong>
          <MathContent className="demo-card-question">{card.question || "仅有图片的错题"}</MathContent>
          {card.errorReason && <MathContent className="demo-card-reason">{card.errorReason}</MathContent>}
          <footer>{card.status === "organized" ? <CheckCircle2 size={13} /> : <PencilLine size={13} />}{card.updatedAt.slice(0, 10)}</footer>
        </article>)}
        {!loading && cards.length === 0 && <p className="agent-card-empty">暂无卡片；不使用 @ 将创建新卡片。</p>}
      </div>
    </details>
  );
}
