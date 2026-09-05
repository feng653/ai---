import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";

export type KnowledgeSelection = {
  unclassified?: boolean;
  key: string;
  label: string;
  subject: string;
  chapter?: string;
  point?: string;
};

export type KnowledgeTreeNode = {
  key: string;
  label: string;
  level: 1 | 2 | 3;
  count: number;
  selection: KnowledgeSelection;
  children: KnowledgeTreeNode[];
};

type MutableNode = {
  label: string;
  cardIds: Set<string>;
  children: Map<string, MutableNode>;
};

const node = (label: string): MutableNode => ({ label, cardIds: new Set(), children: new Map() });
const keyOf = (...parts: string[]) => parts.map(encodeURIComponent).join("/");
const sortByLabel = (left: MutableNode, right: MutableNode) => left.label.localeCompare(right.label, "zh-CN");

export function buildKnowledgeTree(cards: Card[]): KnowledgeTreeNode[] {
  const subjects = new Map<string, MutableNode>();
  for (const card of cards) {
    for (const point of card.knowledgePoints) {
      const subjectName = point.subject.trim() || "未分类学科";
      const chapterValue = point.chapter?.trim() || UNCATEGORIZED_CHAPTER_FILTER;
      const chapterName = chapterValue === UNCATEGORIZED_CHAPTER_FILTER ? "未分章节" : chapterValue;
      const pointName = point.name.trim();
      if (!pointName) continue;
      const subject = subjects.get(subjectName) ?? node(subjectName);
      const chapter = subject.children.get(chapterValue) ?? node(chapterName);
      const leaf = chapter.children.get(pointName) ?? node(pointName);
      subject.cardIds.add(card.id);
      chapter.cardIds.add(card.id);
      leaf.cardIds.add(card.id);
      chapter.children.set(pointName, leaf);
      subject.children.set(chapterValue, chapter);
      subjects.set(subjectName, subject);
    }
  }
  const convert = (
    item: MutableNode, level: 1 | 2 | 3, subject: string, chapter?: string,
  ): KnowledgeTreeNode => {
    const point = level === 3 ? item.label : undefined;
    const parts = [subject, chapter, point].filter((value): value is string => Boolean(value));
    const key = keyOf(...parts);
    return {
      key, label: item.label, level, count: item.cardIds.size,
      selection: { key, label: item.label, subject, chapter, point },
      children: [...item.children.entries()].sort((left, right) => sortByLabel(left[1], right[1]))
        .map(([childKey, child]) => convert(
          child, (level + 1) as 2 | 3, subject, level === 1 ? childKey : chapter,
        )),
    };
  };
  const result = [...subjects.values()].sort(sortByLabel)
    .map((subject) => convert(subject, 1, subject.label));
  const pending = cards.filter((card) => !card.knowledgePoints.some((point) => point.name.trim())).length;
  if (pending) result.unshift({
    key: "pending-classification", label: "待归档", level: 1, count: pending, children: [],
    selection: { key: "pending-classification", label: "待归档", subject: "", unclassified: true },
  });
  return result;
}

export function searchKnowledgeTree(nodes: KnowledgeTreeNode[], query: string): KnowledgeTreeNode[] {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return nodes;
  const visit = (item: KnowledgeTreeNode): KnowledgeTreeNode | null => {
    if (item.label.toLocaleLowerCase().includes(keyword)) return item;
    const children = item.children.map(visit).filter((child): child is KnowledgeTreeNode => Boolean(child));
    return children.length ? { ...item, children } : null;
  };
  return nodes.map(visit).filter((item): item is KnowledgeTreeNode => Boolean(item));
}

export function selectionPath(selection: KnowledgeSelection | null): string {
  if (!selection) return "全部知识点";
  if (selection.unclassified) return "待归档";
  const chapter = selection.chapter === UNCATEGORIZED_CHAPTER_FILTER ? "未分章节" : selection.chapter;
  return [selection.subject, chapter, selection.point].filter(Boolean).join(" / ");
}
