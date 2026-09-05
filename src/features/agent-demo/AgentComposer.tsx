import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import type { Card } from "../../domain/card";
import { agentId } from "./agentWorkflow";
import { useCardMentions } from "../agent/useCardMentions";
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
  const mention = useCardMentions(cards);
  const text = mention.text;
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
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
    const references = mention.references;
    onSend(text.trim(), attachments, references);
    mention.clear();
    setAttachments([]);
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
      <label className="agent-message-label" htmlFor={`${mention.menuId}-input`}>消息</label>
      <textarea id={`${mention.menuId}-input`} ref={mention.inputRef} value={text} rows={3}
        role="combobox" aria-autocomplete="list" aria-controls={mention.menuId} aria-expanded={mention.open}
        aria-activedescendant={mention.open && mention.options.length ? `${mention.menuId}-${mention.index}` : undefined}
        onChange={(event) => mention.change(event.target.value, event.target.selectionStart)}
        onClick={(event) => mention.change(event.currentTarget.value, event.currentTarget.selectionStart)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || mention.keyDown(event)) return;
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
        }} />
      {mention.open && <div className="agent-mention-menu" id={mention.menuId} role="listbox" aria-label="引用卡片">
        <small>{mention.path.join(" / ") || "学科"}</small>
        {mention.options.map((option, index) => <button id={`${mention.menuId}-${index}`}
          className={index === mention.index ? "active" : ""} tabIndex={-1} type="button" role="option"
          aria-selected={index === mention.index} key={option.card?.id || option.label}
          onMouseDown={(event) => event.preventDefault()} onClick={() => mention.choose(option)}>
          {option.label}{option.card ? "" : " ›"}</button>)}
        {!mention.options.length && <span>无匹配结果</span>}
      </div>}
      {error && <small className="agent-input-error">{error}</small>}
      <footer>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={attachments.length >= 3 || busy}>
          <ImagePlus size={17} />添加图片 <small>{attachments.length}/3</small>
        </button>
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
