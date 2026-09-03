import { ImagePlus, X } from "lucide-react";
import { useState, type Dispatch, type DragEvent, type RefObject, type SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AssetPreview } from "../../components/AssetPreview";
import { ERROR_TYPES, type Card, type CardAsset, type CardInput, type KnowledgePoint } from "../../domain/card";
import { KnowledgePicker } from "./KnowledgePicker";

export type CardFormValues = Omit<CardInput, "knowledgePoints" | "assets">;
type Props = {
  form: UseFormReturn<CardFormValues>; assets: CardAsset[]; knowledgePoints: KnowledgePoint[]; availableCards: Card[];
  chapterDraft: string; pointDraft: string; fileInput: RefObject<HTMLInputElement | null>;
  setChapterDraft: Dispatch<SetStateAction<string>>; setPointDraft: Dispatch<SetStateAction<string>>;
  setKnowledgePoints: Dispatch<SetStateAction<KnowledgePoint[]>>; addKnowledgePoint: () => void;
  selectImage: (file?: File) => void; removeAsset: (asset: CardAsset) => Promise<void>;
};

export function CardEditorFields(props: Props) {
  const { form, assets, knowledgePoints, availableCards, chapterDraft, pointDraft, fileInput,
    setChapterDraft, setPointDraft, setKnowledgePoints, addKnowledgePoint, selectImage, removeAsset } = props;
  const [draggingImage, setDraggingImage] = useState(false);
  const acceptDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault(); setDraggingImage(false);
    selectImage(Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/")));
  };
  const addExisting = (point: KnowledgePoint) => setKnowledgePoints((items) => items.length >= 3 ? items : [...items, point]);
  return <>
    <section className="editor-section">
      <div className="section-title"><span>01</span><div><h2>题目材料</h2><p>题目文字与图片至少保留一项。</p></div></div>
      <label className="field full"><span>学科</span><input {...form.register("subject")} /></label>
      <label className="field full"><span>题目</span><textarea {...form.register("question")}
        placeholder="输入题目内容；只有图片时也可以先保存" rows={4} /></label>
      <div className="asset-editor">{assets.map((asset) => <div className="asset-preview" key={asset.id}>
        <AssetPreview asset={asset} alt="题目预览" fallback="compact" />
        <button type="button" aria-label="删除图片" onClick={() => removeAsset(asset)}><X size={15} /></button></div>)}
        <button className={`upload-zone${draggingImage ? " dragging" : ""}`} type="button"
          onClick={() => fileInput.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDraggingImage(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingImage(false); }}
          onDrop={acceptDrop}><ImagePlus size={25} /><strong>选择或拖入题目图片</strong>
          <small>支持 PNG、JPG、WebP，最大 15MB</small></button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(event) => selectImage(event.target.files?.[0])} /></div>
    </section>
    <section className="editor-section">
      <div className="section-title"><span>02</span><div><h2>作答与诊断</h2><p>先记录事实，再补充判断。</p></div></div>
      <div className="form-grid"><label className="field"><span>我的答案 <small>可选</small></span>
        <textarea {...form.register("userAnswer")} rows={3} /></label>
        <label className="field"><span>正确答案 <small>可选</small></span><textarea {...form.register("correctAnswer")} rows={3} /></label>
        <label className="field full"><span>第一处错误</span><input {...form.register("errorLocation")} /></label>
        <label className="field full"><span>错误原因</span><textarea {...form.register("errorReason")} rows={2} /></label></div>
      <div className="choice-row" aria-label="错误类型">{ERROR_TYPES.map((type) => <button type="button" key={type}
        className={form.watch("errorType") === type ? "active" : ""}
        aria-pressed={form.watch("errorType") === type} onClick={() => form.setValue("errorType", type, { shouldDirty: true })}>{type}</button>)}</div>
      <div className="form-grid editor-explanation"><label className="field full"><span>正确解法</span>
        <textarea {...form.register("solution")} rows={4} /></label>
        <label className="field full"><span>补充说明 <small>可选</small></span><textarea {...form.register("supplementalNote")} rows={2} /></label></div>
    </section>
    <section className="editor-section">
      <div className="section-title"><span>03</span><div><h2>知识归档</h2><p>从已有知识树选择，或新建知识点；最多添加 3 个。</p></div></div>
      <KnowledgePicker cards={availableCards} selected={knowledgePoints} onAdd={addExisting} />
      <div className="knowledge-editor-block"><span className="field-label">已选知识点 <small>{knowledgePoints.length}/3</small></span>
        <div className="knowledge-list">{knowledgePoints.map((point, index) => <span key={`${point.name}-${index}`}>
          {point.subject} › {point.chapter || "未分类章节"} › {point.name}
          <button type="button" aria-label={`删除${point.name}`} onClick={() => setKnowledgePoints((items) => items.filter((_, i) => i !== index))}>×</button></span>)}</div>
        {knowledgePoints.length < 3 && <div className="knowledge-add"><input value={chapterDraft}
          onChange={(event) => setChapterDraft(event.target.value)} placeholder="章节（可选）" />
          <input value={pointDraft} onChange={(event) => setPointDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addKnowledgePoint(); } }} placeholder="或输入新知识点" />
          <button className="button" type="button" onClick={addKnowledgePoint}>新建</button></div>}
      </div>
    </section>
  </>;
}
