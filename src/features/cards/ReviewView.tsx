import { Check, ChevronDown, LoaderCircle, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MathContent } from "../../components/MathContent";
import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import type { PracticeCardDraft } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";
import { buildKnowledgeCards } from "./learningContent";
import type { KnowledgeSelection } from "./knowledgeTree";
import { buildPracticeCardDrafts, pointKey, reviewSources } from "./reviewCards";

type Props = {
  allCards: Card[];
  initialSelection: KnowledgeSelection | null;
  savedCards: Card[];
  onOpenSource: (id: string) => void;
  onSave: (drafts: PracticeCardDraft[]) => Promise<Card[]>;
};

export function ReviewView({ allCards, initialSelection, savedCards, onOpenSource, onSave }: Props) {
  const points = useMemo(() => buildKnowledgeCards(allCards, null), [allCards]);
  const initialKey = initialSelection?.point ? pointKey({
    subject: initialSelection.subject,
    chapter: initialSelection.chapter === UNCATEGORIZED_CHAPTER_FILTER ? null : initialSelection.chapter,
    name: initialSelection.point,
  }) : points[0]?.selection.key;
  const [selectedPoints, setSelectedPoints] = useState(() => new Set(initialKey ? [initialKey] : []));
  const available = useMemo(() => reviewSources(allCards, selectedPoints), [allCards, selectedPoints]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(() => new Set(
    allCards.filter((card) => card.knowledgePoints.some((point) => initialKey === pointKey(point)))
      .map((card) => card.id),
  ));
  const [count, setCount] = useState(Math.max(1, selectedSources.size));
  const [mode, setMode] = useState<"setup" | "saving" | "saved">("setup");
  const [latest, setLatest] = useState<Card[]>([]);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = new Set(available.map((card) => card.id));
    setSelectedSources((current) => new Set([...current].filter((id) => ids.has(id))));
  }, [available]);
  useEffect(() => setCount((value) => Math.max(selectedSources.size, value)), [selectedSources.size]);

  const togglePoint = (key: string) => setSelectedPoints((current) => {
    const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next;
  });
  const toggleSource = (id: string) => setSelectedSources((current) => {
    const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const generate = async () => {
    const chosen = allCards.filter((card) => selectedSources.has(card.id));
    const drafts = buildPracticeCardDrafts(chosen, selectedPoints, count);
    if (!drafts.length) { setError("至少选择一道来源错题"); return; }
    setMode("saving"); setError("");
    try { setLatest(await onSave(drafts)); setMode("saved"); }
    catch (reason) { setError(errorMessage(reason, "习题卡保存失败，请重试")); setMode("setup"); }
  };

  if (mode === "saving") return <section className="practice-generation" role="status">
    <span><LoaderCircle className="spin" /></span><small>PRACTICE CARD BUILDER</small>
    <h2>正在生成并保存 {count} 张习题卡</h2>
    <p>来源 revision 会在写入前再次核对，避免把过期内容带入新题。</p><i />
  </section>;
  if (mode === "saved") return <section className="practice-results">
    <header><div><small>SAVED PRACTICE CARDS</small><h2>本次 {latest.length} 张已保存</h2>
      <p>每张练习题都是独立习题卡，并保留知识点与来源版本。</p></div>
      <button className="button" onClick={() => setMode("setup")}>继续生成</button></header>
    <div className="practice-card-grid">{latest.map((card, index) => <article key={card.id}>
      <header><span><Check size={12} />已保存</span><small>习题卡 {String(index + 1).padStart(2, "0")}</small></header>
      <MathContent className="practice-prompt">{card.question}</MathContent>
      <p>{card.knowledgePoints.map((point) => point.name).join(" · ")}</p>
      <footer><button onClick={() => setRevealed((current) => {
        const next = new Set(current); next.has(card.id) ? next.delete(card.id) : next.add(card.id); return next;
      })}>{revealed.has(card.id) ? "收起答案" : "查看答案"}<ChevronDown size={14} /></button>
        <small>{card.sourceRevisions?.length ?? 0} 道来源</small></footer>
      {revealed.has(card.id) && <div className="practice-answer"><MathContent>{card.correctAnswer}</MathContent>
        <MathContent>{card.solution}</MathContent></div>}
    </article>)}</div></section>;

  const minimum = selectedSources.size;
  return <section className="practice-builder">
    <header><div><small>PRACTICE CARD BUILDER</small><h2>从错题生成习题卡</h2>
      <p>先限定知识点，再精确选择生成依据。</p></div><span><b>{savedCards.length}</b> 张已保存</span></header>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="practice-builder-grid"><div className="practice-flow">
      <ReviewStep number="01" title="选择知识点范围" hint="支持跨知识点多选。">
        <div className="practice-point-groups">{points.map((card) => <button key={card.selection.key}
          aria-pressed={selectedPoints.has(card.selection.key)}
          className={selectedPoints.has(card.selection.key) ? "active" : ""}
          onClick={() => togglePoint(card.selection.key)}><span>{card.selection.point}</span><b>{card.sources.length}</b></button>)}</div>
      </ReviewStep>
      <ReviewStep number="02" title="选择来源错题" hint="新题只基于勾选的错题生成。">
        <div className="source-range-head"><span>范围内共 {available.length} 道错题</span><button onClick={() => {
          const all = available.length > 0 && available.every((card) => selectedSources.has(card.id));
          setSelectedSources(new Set(all ? [] : available.map((card) => card.id)));
        }}>{available.length > 0 && available.every((card) => selectedSources.has(card.id)) ? "取消全选" : "全选范围"}</button></div>
        <div className="practice-source-list">{available.map((card) => <button key={card.id} role="checkbox"
          aria-checked={selectedSources.has(card.id)} onClick={() => toggleSource(card.id)}>
          <span>{selectedSources.has(card.id) && <Check size={12} />}</span><span><b>{card.question || "图片题"}</b>
            <small>{card.knowledgePoints.map((point) => point.name).join(" · ")}</small></span></button>)}</div>
      </ReviewStep>
      <ReviewStep number="03" title="设置生成数量" hint="下限随来源错题数自动变化。">
        <div className="quantity-control"><label>生成卡片数<input aria-label="生成卡片数" type="number" min={minimum || 1}
          max={50} value={count} onChange={(event) => setCount(Math.max(minimum, Math.min(50, Number(event.target.value))))} /></label>
          <div><button aria-label="减少生成数量" disabled={count <= minimum} onClick={() => setCount(count - 1)}><Minus /></button>
            <button aria-label="增加生成数量" disabled={count >= 50} onClick={() => setCount(count + 1)}><Plus /></button></div></div>
        <p className="quantity-note">最少 {minimum} 张，保证每道来源错题至少生成 1 张。</p>
      </ReviewStep>
    </div><aside className="practice-summary"><small>本次生成</small><dl><div><dt>知识点</dt><dd>{selectedPoints.size} 个</dd></div>
      <div><dt>来源错题</dt><dd>{minimum} 道</dd></div><div><dt>习题卡片</dt><dd>{count} 张</dd></div></dl>
      <p>{minimum ? `已保证 ${minimum} 道来源各生成至少 1 张。` : "请选择生成范围。"}</p>
      <button className="button primary" disabled={!minimum} onClick={() => void generate()}><Sparkles size={15} />生成并保存 {count} 张</button>
      <small>生成结果写入当前运行时的卡片存储。</small></aside></div>
  </section>;
}

function ReviewStep(props: { number: string; title: string; hint: string; children: React.ReactNode }) {
  return <section className="practice-step"><header><span>{props.number}</span><div><h3>{props.title}</h3><p>{props.hint}</p></div></header>{props.children}</section>;
}
