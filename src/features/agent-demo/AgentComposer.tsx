import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import type { Card } from "../../domain/card";
import { agentId, cardReferenceLabel } from "./agentWorkflow";
import type { AgentAttachment } from "./types";

type Props = {
  busy: boolean;
  cards: Card[];
  onSend: (text: string, attachments: AgentAttachment[], referencedCardIds: string[]) => void;
};

function readImage(file: File): Promise<AgentAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: agentId("image"), name: file.name, previewUrl: String(reader.result), file });
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function AgentComposer({ busy, cards, onSend }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [referencedCards, setReferencedCards] = useState<Array<{ id: string; label: string }>>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [activeMention, setActiveMention] = useState(0);
  const mentionMatch = text.match(/@([^@\s]*)$/);
  const mentionQuery = mentionMatch?.[1].toLocaleLowerCase();
  const mentionCards = mentionMatch ? cards.filter((card) =>
    !mentionQuery || cardReferenceLabel(card).toLocaleLowerCase().includes(mentionQuery)
      || card.question.toLocaleLowerCase().includes(mentionQuery)).slice(0, 5) : [];

  const chooseMention = (card: Card) => {
    if (!mentionMatch) return;
    const start = mentionMatch.index ?? text.length;
    const label = cardReferenceLabel(card);
    setText(`${text.slice(0, start)}@${label} `);
    setReferencedCards((items) => [...items.filter((item) => item.id !== card.id), { id: card.id, label }]);
    setActiveMention(0);
  };

  const addFiles = async (files: File[]) => {
    setError("");
    const available = 3 - attachments.length;
    const images = files.filter((file) => file.type.startsWith("image/")).slice(0, available);
    if (!images.length) { setError("请添加图片文件"); return; }
    if (images.some((file) => file.size > 15 * 1024 * 1024)) {
      setError("单张图片不能超过 15MB"); return;
    }
    try {
      const next = await Promise.all(images.map(readImage));
      setAttachments((items) => [...items, ...next].slice(0, 3));
    } catch { setError("图片读取失败"); }
    finally { if (inputRef.current) inputRef.current.value = ""; }
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  };

  const submit = () => {
    if (busy || (!text.trim() && !attachments.length)) return;
    const references = referencedCards.filter((item) => text.includes(`@${item.label}`)).map((item) => item.id);
    onSend(text.trim(), attachments, references);
    setText("");
    setAttachments([]);
    setReferencedCards([]);
  };

  return (
    <div
      className={`agent-composer${dragging ? " dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={drop}
    >
      {attachments.length > 0 && <div className="agent-attachments">
        {attachments.map((attachment) => <figure key={attachment.id}>
          <img src={attachment.previewUrl} alt={attachment.name} />
          <button type="button" aria-label={`移除 ${attachment.name}`} onClick={() =>
            setAttachments((items) => items.filter((item) => item.id !== attachment.id))}><X size={13} /></button>
        </figure>)}
      </div>}
      <textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setActiveMention(0); }}
        onKeyDown={(event) => {
          if (mentionCards.length && event.key === "ArrowDown") {
            event.preventDefault(); setActiveMention((index) => (index + 1) % mentionCards.length); return;
          }
          if (mentionCards.length && event.key === "ArrowUp") {
            event.preventDefault(); setActiveMention((index) => (index - 1 + mentionCards.length) % mentionCards.length); return;
          }
          if (mentionCards.length && event.key === "Enter") {
            event.preventDefault(); chooseMention(mentionCards[activeMention] ?? mentionCards[0]); return;
          }
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
        }}
        placeholder="提问，或描述要创建的卡片；修改时请 @ 卡片…"
        rows={3}
      />
      {mentionCards.length > 0 && <div className="agent-mention-menu" role="listbox" aria-label="引用卡片">
        <small>引用卡片</small>
        {mentionCards.map((card, index) => <button
          className={index === activeMention ? "active" : ""}
          type="button"
          role="option"
          aria-selected={index === activeMention}
          key={card.id}
          onMouseDown={(event) => { event.preventDefault(); chooseMention(card); }}
        ><strong>@{cardReferenceLabel(card)}</strong><span>{card.question || "仅有图片的错题"}</span></button>)}
      </div>}
      {error && <small className="agent-input-error">{error}</small>}
      <footer>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={attachments.length >= 3 || busy}>
          <ImagePlus size={17} />添加图片 <small>{attachments.length}/3</small>
        </button>
        <span>Enter 发送 · Shift+Enter 换行</span>
        <button className="agent-send" type="button" onClick={submit} disabled={busy || (!text.trim() && !attachments.length)}>
          <Send size={16} />发送
        </button>
      </footer>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) =>
        void addFiles(Array.from(event.target.files ?? []))} />
      {dragging && <div className="agent-drop-hint"><ImagePlus size={24} />松开以添加图片</div>}
    </div>
  );
}
