import { useEffect, useMemo, useState } from "react";
import { MathContent } from "../../components/MathContent";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { buildReviewSet } from "./learningContent";

type Props = { cards: Card[]; selection: KnowledgeSelection; onOpenSource: (id: string) => void };

export function ReviewView({ cards, selection, onOpenSource }: Props) {
  const [questionCount, setQuestionCount] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const questions = useMemo(
    () => buildReviewSet(cards, selection, questionCount, rotation),
    [cards, questionCount, rotation, selection],
  );

  useEffect(() => {
    setRotation(0); setRevealed(new Set()); setMastered(new Set());
  }, [selection.key]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((current) => {
    const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const regenerate = () => {
    setRotation((value) => value + questionCount); setRevealed(new Set()); setMastered(new Set());
  };
  const completed = questions.filter((question) => mastered.has(question.id)).length;

  return <section className="review-view">
    <header className="learning-view-heading"><span>?</span><div>
      <small>基于当前知识点生成 · {completed}/{questions.length} 已掌握</small>
      <h3>{selection.point} · 复习题</h3>
    </div><label className="review-count">每次生成<select aria-label="每次生成复习题数量" value={questionCount}
      onChange={(event) => { setQuestionCount(Number(event.target.value)); setRevealed(new Set()); setMastered(new Set()); }}>
      {[1, 2, 3, 4, 5].map((count) => <option value={count} key={count}>{count} 题</option>)}
    </select></label><button type="button" onClick={regenerate}>换一组</button></header>
    <div className="review-progress"><i style={{ width: `${questions.length ? completed / questions.length * 100 : 0}%` }} /></div>
    <div className="review-questions">{questions.map((question, index) => <article
      className={mastered.has(question.id) ? "mastered" : ""} key={question.id}>
      <header><span>第 {index + 1} 题</span><em>{question.kind}</em><small>{question.sourceCardIds.length} 个来源</small></header>
      <MathContent className="review-prompt">{question.prompt}</MathContent>
      <div className="review-actions"><button type="button" onClick={() => toggle(setRevealed, question.id)}>
        {revealed.has(question.id) ? "收起答案" : "查看答案"}</button>
        <button type="button" className={mastered.has(question.id) ? "done" : ""}
          onClick={() => toggle(setMastered, question.id)}>✓ {mastered.has(question.id) ? "已掌握" : "标记掌握"}</button></div>
      {revealed.has(question.id) && <div className="review-answer"><strong>答案</strong><MathContent>{question.answer}</MathContent>
        <strong>解析</strong><MathContent>{question.explanation}</MathContent></div>}
    </article>)}</div>
    <details className="learning-sources"><summary>查看本组使用的来源错题</summary><div>
      {[...new Map(cards.map((card) => [card.id, card])).values()].map((card, index) => <button
        type="button" key={card.id} onClick={() => onOpenSource(card.id)}><span>{index + 1}</span>{card.question}</button>)}
    </div></details>
  </section>;
}
