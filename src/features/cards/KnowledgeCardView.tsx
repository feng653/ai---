import { MathContent } from "../../components/MathContent";
import type { KnowledgeSelection } from "./knowledgeTree";
import type { KnowledgeCardContent } from "./learningContent";

type Props = {
  cards: KnowledgeCardContent[];
  detail: KnowledgeCardContent | null;
  onSelect: (selection: KnowledgeSelection) => void;
  onOpenSource: (id: string) => void;
};

function SourceList({ card, onOpen }: { card: KnowledgeCardContent; onOpen: (id: string) => void }) {
  return <details className="learning-sources"><summary>查看 {card.sources.length} 张来源错题</summary>
    <div>{card.sources.map((source, index) => <button type="button" key={source.id} onClick={() => onOpen(source.id)}>
      <span>{index + 1}</span>{source.question || "仅保存了题目图片"}
    </button>)}</div>
  </details>;
}

export function KnowledgeCardView({ cards, detail, onSelect, onOpenSource }: Props) {
  if (detail) return <section className="knowledge-card-detail">
    <header className="learning-view-heading"><span>知</span><div>
      <small>{detail.selection.subject} / {detail.selection.chapter} · 随来源错题自动更新</small>
      <h3>{detail.selection.point} · 知识卡片</h3>
    </div></header>
    <div className="knowledge-evidence"><span><b>{detail.sources.length}</b>道来源错题</span>
      <span><b>{detail.mistakes.length}</b>个错误样本</span><span><b>{detail.coverage}</b>内容状态</span></div>
    <section className="learning-section"><em>01</em><div><h4>核心方法</h4>
      {detail.coreMethods.map((method) => <MathContent key={method}>{method}</MathContent>)}</div></section>
    <section className="learning-section mistake-section"><em>02</em><div><h4>你的易错提醒</h4>
      {detail.mistakes.map((mistake) => <article key={mistake.cardId}>
        <strong>{mistake.content}</strong><MathContent>{mistake.question}</MathContent>
      </article>)}</div></section>
    <SourceList card={detail} onOpen={onOpenSource} />
  </section>;

  if (!cards.length) return <div className="learning-empty"><strong>还没有可生成的知识卡片</strong>
    <span>为错题关联具体知识点后，这里会按知识点自动汇总。</span></div>;
  return <section className="knowledge-card-grid" aria-label="知识卡片">
    {cards.map((card) => <article key={card.selection.key}>
      <header><span>{card.selection.subject} / {card.selection.chapter}</span><em>{card.coverage}</em></header>
      <h3>{card.selection.point}</h3><MathContent>{card.coreMethods[0]}</MathContent>
      <div><span><b>{card.sources.length}</b> 道错题</span><span><b>{card.mistakes.length}</b> 个错误样本</span></div>
      <footer><span>一知识点一张卡</span><button type="button" onClick={() => onSelect(card.selection)}>查看知识卡片 →</button></footer>
    </article>)}
  </section>;
}
