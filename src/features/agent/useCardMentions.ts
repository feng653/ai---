import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Card } from "../../domain/card";
import { cardReferenceLabel } from "../agent-demo/agentWorkflow";

type Option = { label: string; card?: Card };
const paths = (card: Card) => (card.knowledgePoints.length ? card.knowledgePoints : [{
  subject: card.subject, chapter: "", name: "未分类知识点",
}]).map((point) => [point.subject || "未分类学科", point.chapter || "未分章节", point.name]);
const matches = (card: Card, path: string[]) => paths(card).some((parts) => path.every((part, i) => parts[i] === part));
const token = (card: Card) => `@「${cardReferenceLabel(card)} · ${card.id}」`;

export function useCardMentions(cards: Card[]) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const menuId = useId();
  const match = !dismissed ? text.slice(0, cursor).match(/@([^@\n「」]*)$/) : null;
  const query = (match?.[1] || "").toLocaleLowerCase();
  const eligible = cards.filter((card) => matches(card, path));
  const branches: Option[] = path.length < 3 ? [...new Set(eligible.flatMap((card) => paths(card)
    .filter((parts) => path.every((part, i) => parts[i] === part)).map((parts) => parts[path.length])))]
    .sort((a, b) => a.localeCompare(b, "zh-CN")).map((label) => ({ label })) : [];
  const leaves = path.length === 3 || query ? eligible.map((card) => ({ label: cardReferenceLabel(card), card })) : [];
  const options = [...branches, ...leaves].filter((option) => option.label.toLocaleLowerCase().includes(query));
  const index = Math.min(active, Math.max(0, options.length - 1));
  useLayoutEffect(() => {
    if (caret.current === null) return;
    inputRef.current?.focus(); inputRef.current?.setSelectionRange(caret.current, caret.current); caret.current = null;
  }, [text, path]);
  const close = () => { setDismissed(true); setPath([]); setActive(0); };
  const choose = (option: Option) => {
    if (!match) return;
    const start = match.index!, insertion = option.card ? `${token(option.card)} ` : "@";
    setText(text.slice(0, start) + insertion + text.slice(cursor));
    const position = start + insertion.length; setCursor(position); caret.current = position;
    setActive(0);
    if (option.card) close(); else setPath([...path, option.label]);
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || !match) return false;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return true; }
    if (["ArrowDown", "ArrowUp"].includes(event.key) && options.length) {
      event.preventDefault(); setActive((index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length); return true;
    }
    if (event.key === "Tab" && event.shiftKey) {
      if (!path.length) { close(); return false; }
      event.preventDefault(); setPath(path.slice(0, -1)); setActive(0); return true;
    }
    if (["Tab", "Enter"].includes(event.key)) {
      if (!options.length) { close(); return event.key === "Enter"; }
      event.preventDefault(); choose(options[index]); return true;
    }
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) close();
    return false;
  };
  return {
    text, inputRef, menuId, path, options, index, open: Boolean(match), choose, keyDown, close,
    references: cards.filter((card) => text.includes(token(card))).map((card) => card.id),
    change: (value: string, position: number) => {
      const next = value.slice(0, position).match(/@([^@\n「」]*)$/);
      if (next?.index !== match?.index) setPath([]);
      setText(value); setCursor(position); setActive(0); setDismissed(false);
    },
    clear: () => { setText(""); setCursor(0); close(); },
  };
}
