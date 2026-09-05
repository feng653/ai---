import { Check, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PracticeDifficulty, PracticeGenerationRequest } from "../../domain/ai";
import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import { buildKnowledgeCards } from "./learningContent";
import type { KnowledgeSelection } from "./knowledgeTree";
import { buildPracticeGenerationRequest, pointKey, reviewSources } from "./reviewCards";
import { AiRequirementsField } from "./AiRequirementsField";

type Props = {
  allCards: Card[];
  initialSelection: KnowledgeSelection | null;
  error: string;
  onCancel: () => void;
  onGenerate: (request: PracticeGenerationRequest) => void;
};

const difficulties: Array<{ value: PracticeDifficulty; label: string; hint: string }> = [
  { value: "easier", label: "更简单", hint: "减少步骤或降低数值复杂度" },
  { value: "same", label: "持平", hint: "保持与来源错题相近的复杂度" },
  { value: "harder", label: "更难", hint: "增加一个条件或推理步骤" },
];

export function ReviewBuilder({ allCards, initialSelection, error, onCancel, onGenerate }: Props) {
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
  const [mode, setMode] = useState<"recall" | "similar">("recall");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>("same");
  const [additionalRequirements, setAdditionalRequirements] = useState("");

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
  const minimum = selectedSources.size;
  const submit = () => {
    const request = buildPracticeGenerationRequest(
      allCards, selectedPoints, count, difficulty, additionalRequirements, selectedSources, mode,
    );
    if (request) onGenerate(request);
  };

  return <section className="practice-builder">
    <header><div><h2>生成复习问答</h2></div>
      <button type="button" className="button ghost" onClick={onCancel}>返回卡片页</button></header>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <label className="field">类型<select aria-label="练习类型" value={mode} onChange={(event) => setMode(event.target.value as "recall" | "similar")}><option value="recall">错因概念问答</option><option value="similar">相似练习</option></select></label>
    <div className="practice-builder-grid"><div className="practice-flow">
      <ReviewStep number="01" title="选择知识点范围" hint="支持跨知识点多选。">
        <div className="practice-point-groups">{points.map((card) => <button type="button"
          key={card.selection.key} aria-pressed={selectedPoints.has(card.selection.key)}
          className={selectedPoints.has(card.selection.key) ? "active" : ""}
          onClick={() => togglePoint(card.selection.key)}><span>{card.selection.point}</span><b>{card.sources.length}</b></button>)}</div>
      </ReviewStep>
      <ReviewStep number="02" title="选择来源错题" hint="AI 会读取题目、作答和真实错误点。">
        <div className="source-range-head"><span>范围内共 {available.length} 道错题</span><button type="button" onClick={() => {
          const all = available.length > 0 && available.every((card) => selectedSources.has(card.id));
          setSelectedSources(new Set(all ? [] : available.map((card) => card.id)));
        }}>{available.length > 0 && available.every((card) => selectedSources.has(card.id)) ? "取消全选" : "全选范围"}</button></div>
        <div className="practice-source-list">{available.map((card) => <button type="button" key={card.id}
          role="checkbox" aria-checked={selectedSources.has(card.id)} onClick={() => toggleSource(card.id)}>
          <span>{selectedSources.has(card.id) && <Check size={12} aria-hidden="true" />}</span><span><b>{card.question || "图片题"}</b>
            <small>{card.errorReason || card.errorLocation || "尚未补充错误点"}</small></span></button>)}</div>
      </ReviewStep>
      {mode === "similar" && <ReviewStep number="03" title="选择题目难度" hint="难度相对于本次选择的来源错题。">
        <div className="practice-difficulty" role="group" aria-label="题目难度">
          {difficulties.map((item) => <button type="button" key={item.value}
            aria-pressed={difficulty === item.value} className={difficulty === item.value ? "active" : ""}
            onClick={() => setDifficulty(item.value)}><strong>{item.label}</strong></button>)}
        </div>
      </ReviewStep>}
      <ReviewStep number="04" title="设置生成数量" hint="每道来源错题至少生成一张。">
        <div className="quantity-control"><label>生成卡片数<input aria-label="生成卡片数" type="number"
          min={minimum || 1} max={50} value={count}
          onChange={(event) => setCount(Math.max(minimum, Math.min(50, Number(event.target.value))))} /></label>
          <div><button type="button" aria-label="减少生成数量" disabled={count <= minimum}
            onClick={() => setCount(count - 1)}><Minus aria-hidden="true" /></button>
            <button type="button" aria-label="增加生成数量" disabled={count >= 50}
              onClick={() => setCount(count + 1)}><Plus aria-hidden="true" /></button></div></div>
        <p className="quantity-note">最少 {minimum} 张，最多 50 张。</p>
      </ReviewStep>
      <ReviewStep number="05" title="补充生成要求" hint="可选；用于指定题型、侧重点或表达方式。">
        <AiRequirementsField id="practice-card-ai-requirements"
          value={additionalRequirements} onChange={setAdditionalRequirements}
 />
      </ReviewStep>
    </div><aside className="practice-summary"><small>本次生成</small><dl>
      <div><dt>知识点</dt><dd>{selectedPoints.size} 个</dd></div>
      <div><dt>来源错题</dt><dd>{minimum} 道</dd></div>
      {mode === "similar" && <div><dt>题目难度</dt><dd>{difficulties.find((item) => item.value === difficulty)?.label}</dd></div>}
      <div><dt>习题卡片</dt><dd>{count} 张</dd></div></dl>
      <button type="button" className="button primary" disabled={!minimum} onClick={submit}>
        <Sparkles size={15} aria-hidden="true" />AI 生成并保存 {count} 张
      </button></aside></div>
  </section>;
}

function ReviewStep(props: { number: string; title: string; hint: string; children: React.ReactNode }) {
  return <section className="practice-step"><header><div><h3>{props.title}</h3></div></header>{props.children}</section>;
}
