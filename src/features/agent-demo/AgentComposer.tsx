import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { demoId } from "./demoAgent";
import type { DemoAttachment } from "./types";

type Props = {
  busy: boolean;
  onSend: (text: string, attachments: DemoAttachment[]) => void;
};

function readImage(file: File): Promise<DemoAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: demoId("image"), name: file.name, previewUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function AgentComposer({ busy, onSend }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<DemoAttachment[]>([]);
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
    onSend(text.trim(), attachments);
    setText("");
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
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
        }}
        placeholder="描述要创建或修改的卡片，也可以拖入题目图片…"
        rows={3}
      />
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
