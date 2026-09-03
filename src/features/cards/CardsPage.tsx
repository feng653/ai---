import { BookOpen, Clock3, Filter, Image, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MathContent } from "../../components/MathContent";
import type { CardStatus } from "../../domain/card";
import { useCards } from "../../hooks/useCards";
import { KnowledgeTreeFilter } from "./KnowledgeTreeFilter";
import { selectionPath, type KnowledgeSelection } from "./knowledgeTree";

const statusLabel: Record<CardStatus, string> = { draft: "待完善", organized: "已整理" };

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function CardsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CardStatus | "all">("all");
  const [knowledge, setKnowledge] = useState<KnowledgeSelection | null>(null);
  const allCards = useCards({});
  const cards = useCards({
    query, status, knowledgeSubject: knowledge?.subject,
    knowledgeChapter: knowledge?.chapter, knowledgePoint: knowledge?.point,
  });

  const counts = useMemo(() => {
    const list = allCards.data ?? [];
    return {
      all: list.length,
      draft: list.filter((card) => card.status === "draft").length,
      organized: list.filter((card) => card.status === "organized").length,
    };
  }, [allCards.data]);

  return (
    <div className="page-content cards-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">PERSONAL ERROR LIBRARY</p>
          <h1>我的错题</h1>
          <p>把错误整理清楚，比记住答案更重要。</p>
        </div>
        <span>共 {counts.all} 张卡片</span>
      </section>

      <section className="search-panel" aria-label="搜索和筛选">
        <label className="search-input">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索题目、答案、解法、错因或知识点…"
          />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="filter-group">
          <Filter size={15} />
          {(["all", "draft", "organized"] as const).map((value) => (
            <button
              key={value}
              className={`filter-chip ${status === value ? "active" : ""}`}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? "全部" : statusLabel[value]}
              <span>{counts[value]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cards-library-layout">
        <KnowledgeTreeFilter cards={allCards.data ?? []} selection={knowledge} onChange={setKnowledge} />
        <div className="cards-results">
          <div className="cards-results-heading"><strong>{selectionPath(knowledge)}</strong>
            <span>{cards.data?.length ?? 0} 张卡片</span></div>
          {cards.isLoading ? (
            <div className="empty-state"><span className="loading-spinner" /><h3>正在读取本地错题…</h3></div>
          ) : cards.isError ? (
            <div className="empty-state error"><h3>错题读取失败</h3><p>{String(cards.error)}</p></div>
          ) : cards.data?.length ? (
            <section className="card-grid" aria-label="错题卡片">
              {cards.data.map((card) => (
                <article className="question-card" key={card.id} tabIndex={0}
                  onClick={() => navigate(`/cards/${card.id}`)}
                  onKeyDown={(event) => event.key === "Enter" && navigate(`/cards/${card.id}`)}>
                  <header><span className="subject">{card.subject || "未分类"}</span>
                    <span className={`card-status ${card.status}`}>{statusLabel[card.status]}</span></header>
                  {card.assets.length > 0 && <span className="image-badge"><Image size={13} />原题图片</span>}
                  <MathContent className="question-title">{card.question || "仅保存了原始题目图片"}</MathContent>
                  <MathContent className="diagnosis-preview">{card.errorReason || "还没有错因诊断，可以手动完善或使用 AI 整理。"}</MathContent>
                  <footer>
                    <div className="tag-list">
                      {card.knowledgePoints.length ? card.knowledgePoints.slice(0, 3).map((point) => (
                        <span key={`${point.subject}-${point.chapter}-${point.name}`}>{point.name}</span>
                      )) : <span className="muted-tag">未关联知识点</span>}
                    </div>
                    <div className="card-meta"><span><Clock3 size={12} />{formatUpdatedAt(card.updatedAt)}</span>
                      <span className="error-type">{card.errorType || "未诊断"}</span></div>
                  </footer>
                </article>
              ))}
            </section>
          ) : (
            <div className="empty-state">
              <span className="empty-icon"><BookOpen size={27} /></span>
              <h3>{query || knowledge || status !== "all" ? "没有找到匹配的错题" : "还没有错题"}</h3>
              <p>可以清除筛选，或上传题目图片新增错题。</p>
              <button className="button primary" onClick={() => navigate("/cards/new")}><Sparkles size={16} />新增错题</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
