import { ArrowRight, Sparkles } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { Card } from "../../domain/card";

type Props = {
  cards: Card[];
  recentIds: Set<string>;
  onOpenCard: (id: string) => void;
  onGenerate: () => void;
};

export function ReviewCardList({ cards, recentIds, onOpenCard, onGenerate }: Props) {
  return <section className="practice-results">
    <header><div><small>已保存复习题</small><h2>复习题卡片</h2>
      <p>先浏览当前知识范围内的卡片，需要新题时再进入 AI 生成。</p></div>
      <button type="button" className="button primary" onClick={onGenerate}>
        <Sparkles size={15} aria-hidden="true" />AI 生成复习题
      </button></header>
    {!cards.length ? <div className="practice-empty"><strong>当前范围还没有复习题卡片</strong>
      <span>可根据已有错题和错误点生成第一组相似题。</span>
      <button type="button" className="button primary" onClick={onGenerate}>开始生成</button></div>
      : <div className="practice-card-grid">{cards.map((card) => <article key={card.id}
        className={recentIds.has(card.id) ? "recent" : ""}>
        <header><span>{recentIds.has(card.id) ? "刚刚生成" : "复习题"}</span>
          <small>{card.knowledgePoints.map((point) => point.name).join(" · ") || "未分类"}</small></header>
        <MathContent className="practice-prompt">{card.question}</MathContent>
        <p>{card.supplementalNote || "由错题生成的相似练习。"}</p>
        <footer><small>{card.sourceRevisions?.length ?? 0} 道来源错题</small>
          <button type="button" onClick={() => onOpenCard(card.id)}>进入卡片<ArrowRight size={14} aria-hidden="true" /></button>
        </footer>
      </article>)}</div>}
  </section>;
}
