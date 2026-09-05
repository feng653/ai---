import { BookOpen, Clock3, Image, Sparkles } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { Card, CardStatus } from "../../domain/card";

type Props = {
  cards: Card[];
  loading: boolean;
  error?: unknown;
  filtered: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
};

const statusLabel: Record<CardStatus, string> = { draft: "草稿", organized: "已整理" };

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function RelatedCardsView({ cards, loading, error, filtered, onOpen, onCreate }: Props) {
  if (loading) return <div className="empty-state"><span className="loading-spinner" /><h3>正在读取本地错题…</h3></div>;
  if (error) return <div className="empty-state error"><h3>错题读取失败</h3><p>{String(error)}</p></div>;
  if (!cards.length) return <div className="empty-state">
    <span className="empty-icon"><BookOpen size={27} /></span>
    <h3>{filtered ? "没有找到匹配的错题" : "还没有错题"}</h3>
    <button className="button primary" onClick={onCreate}><Sparkles size={16} />新增错题</button>
  </div>;
  return <section className="card-grid" aria-label="错题卡片">
    {cards.map((card) => <article className="question-card" key={card.id} tabIndex={0}
      onClick={() => onOpen(card.id)} onKeyDown={(event) => event.key === "Enter" && onOpen(card.id)}>
      <header><span className="subject">{card.subject || "未分类"}</span>
        <span className={`card-status ${card.status}`}>{statusLabel[card.status]}</span></header>
      {card.assets.length > 0 && <span className="image-badge"><Image size={13} />原题图片</span>}
      <MathContent className="question-title">{card.question || "图片错题"}</MathContent>
      <MathContent className="diagnosis-preview">{card.errorReason || "未记录错因"}</MathContent>
      <footer><div className="tag-list">
        {card.knowledgePoints.length ? card.knowledgePoints.slice(0, 3).map((point) => <span
          key={`${point.subject}-${point.chapter}-${point.name}`}>{point.name}</span>) : <span className="muted-tag">未关联知识点</span>}
      </div><div className="card-meta"><span><Clock3 size={12} />{formatUpdatedAt(card.updatedAt)}</span>
        <span className="error-type">{card.errorType || "未诊断"}</span></div></footer>
    </article>)}
  </section>;
}
