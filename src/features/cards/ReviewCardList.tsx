import { ArrowRight, Sparkles } from "lucide-react";
import { ReviewFlashcard } from "./ReviewFlashcard";
import type { Card } from "../../domain/card";

type Props = {
  cards: Card[];
  recentIds: Set<string>;
  onOpenCard: (id: string) => void;
  onGenerate: () => void;
};

export function ReviewCardList({ cards, recentIds, onOpenCard, onGenerate }: Props) {
  return <section className="practice-results">
    <header><div><h2>错因复习</h2></div>
      <button type="button" className="button primary" onClick={onGenerate}>
        <Sparkles size={15} aria-hidden="true" />AI 生成复习题
      </button></header>
    {!cards.length ? <div className="practice-empty"><strong>当前范围还没有复习题卡片</strong>
      <button type="button" className="button primary" onClick={onGenerate}>开始生成</button></div>
      : <div className="practice-card-grid">{cards.map((card) => <article key={card.id}
        className={recentIds.has(card.id) ? "recent" : ""}>
        <header><span>{recentIds.has(card.id) ? "刚刚生成" : "复习题"}</span>
          <small>{card.knowledgePoints.map((point) => point.name).join(" · ") || "未分类"}</small></header>
        <ReviewFlashcard card={card} />
        <footer><small>{card.sourceRevisions?.length ?? 0} 道来源错题</small>
          <button type="button" onClick={() => onOpenCard(card.id)}>进入卡片<ArrowRight size={14} aria-hidden="true" /></button>
        </footer>
      </article>)}</div>}
  </section>;
}
