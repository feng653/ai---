import { useEffect, useMemo, useState } from "react";
import type { Card, KnowledgePoint } from "../../domain/card";
import { buildKnowledgeTree } from "./knowledgeTree";

type Props = {
  cards: Card[];
  selected: KnowledgePoint[];
  onAdd: (point: KnowledgePoint) => void;
};

export function KnowledgePicker({ cards, selected, onAdd }: Props) {
  const subjects = useMemo(() => buildKnowledgeTree(cards), [cards]);
  const [subjectKey, setSubjectKey] = useState("");
  const [chapterKey, setChapterKey] = useState("");
  useEffect(() => {
    if (!subjects.some((item) => item.key === subjectKey)) setSubjectKey(subjects[0]?.key ?? "");
  }, [subjectKey, subjects]);
  const subject = subjects.find((item) => item.key === subjectKey) ?? subjects[0];
  useEffect(() => {
    if (!subject?.children.some((item) => item.key === chapterKey)) setChapterKey(subject?.children[0]?.key ?? "");
  }, [chapterKey, subject]);
  const chapter = subject?.children.find((item) => item.key === chapterKey) ?? subject?.children[0];
  if (!subjects.length) return null;
  return <div className="knowledge-picker" aria-label="从已有知识树选择">
    <section><strong>学科</strong>{subjects.map((item) => <button type="button" key={item.key}
      className={subject?.key === item.key ? "active" : ""} onClick={() => setSubjectKey(item.key)}>{item.label}<small>{item.count}</small></button>)}</section>
    <section><strong>章节</strong>{subject?.children.map((item) => <button type="button" key={item.key}
      className={chapter?.key === item.key ? "active" : ""} onClick={() => setChapterKey(item.key)}>{item.label}<small>{item.count}</small></button>)}</section>
    <section><strong>知识点</strong>{chapter?.children.map((item) => {
      const exists = selected.some((point) => point.subject === item.selection.subject
        && (point.chapter?.trim() || "") === (item.selection.chapter === "__uncategorized__" ? "" : item.selection.chapter)
        && point.name === item.selection.point);
      return <button type="button" key={item.key} className={exists ? "selected" : ""} disabled={exists || selected.length >= 3}
        onClick={() => onAdd({ subject: item.selection.subject,
          chapter: item.selection.chapter === "__uncategorized__" ? null : item.selection.chapter,
          name: item.selection.point! })}>{item.label}<small>{exists ? "已添加" : item.count}</small></button>;
    })}</section>
  </div>;
}
