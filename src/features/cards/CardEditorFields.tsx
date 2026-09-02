import { ImagePlus, X } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AssetPreview } from "../../components/AssetPreview";
import { ERROR_TYPES, type CardAsset, type CardInput, type KnowledgePoint } from "../../domain/card";

export type CardFormValues = Omit<CardInput, "knowledgePoints" | "assets">;

type Props = {
  form: UseFormReturn<CardFormValues>;
  assets: CardAsset[];
  knowledgePoints: KnowledgePoint[];
  chapterDraft: string;
  pointDraft: string;
  fileInput: RefObject<HTMLInputElement | null>;
  setChapterDraft: Dispatch<SetStateAction<string>>;
  setPointDraft: Dispatch<SetStateAction<string>>;
  setKnowledgePoints: Dispatch<SetStateAction<KnowledgePoint[]>>;
  addKnowledgePoint: () => void;
  importImage: (file?: File) => Promise<void>;
  removeAsset: (asset: CardAsset) => Promise<void>;
};

export function CardEditorFields(props: Props) {
  const {
    form, assets, knowledgePoints, chapterDraft, pointDraft, fileInput,
    setChapterDraft, setPointDraft, setKnowledgePoints,
    addKnowledgePoint, importImage, removeAsset,
  } = props;
  return (
    <>
      <section className="editor-section">
        <div className="section-title"><span>1</span><div><h2>录入原始内容</h2><p>题目文本或图片至少填写一项</p></div></div>
        <div className="asset-editor">
          {assets.map((asset) => (
            <div className="asset-preview" key={asset.id}>
              <AssetPreview asset={asset} alt="题目预览" fallback="compact" />
              <button type="button" aria-label="删除图片" onClick={() => removeAsset(asset)}><X size={15} /></button>
            </div>
          ))}
          <button className="upload-zone" type="button" onClick={() => fileInput.current?.click()}>
            <ImagePlus size={25} /><strong>选择题目图片</strong><small>支持 PNG、JPG、WebP，最大 15MB</small>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => importImage(event.target.files?.[0])}
          />
        </div>
        <label className="field full"><span>题目</span><textarea {...form.register("question")} placeholder="输入题目内容；只有图片时也可以先保存" rows={4} /></label>
      </section>

      <section className="editor-section">
        <div className="section-title"><span>2</span><div><h2>题目与答案</h2><p>手动填写始终可用</p></div></div>
        <div className="form-grid">
          <label className="field"><span>学科</span><input {...form.register("subject")} /></label>
          <label className="field"><span>我的答案 <small>可选</small></span><textarea {...form.register("userAnswer")} rows={4} /></label>
          <label className="field"><span>正确答案 <small>可选</small></span><textarea {...form.register("correctAnswer")} rows={4} /></label>
          <label className="field full"><span>补充说明 <small>可选</small></span><textarea {...form.register("supplementalNote")} rows={2} /></label>
        </div>
      </section>

      <section className="editor-section">
        <div className="section-title"><span>3</span><div><h2>诊断与知识点</h2><p>可以手动填写，也可以审阅 AI 建议</p></div></div>
        <div className="form-grid">
          <label className="field full"><span>正确解法</span><textarea {...form.register("solution")} rows={5} /></label>
          <label className="field full"><span>第一处错误</span><textarea {...form.register("errorLocation")} rows={3} /></label>
          <label className="field full"><span>错误原因</span><textarea {...form.register("errorReason")} rows={3} /></label>
          <label className="field"><span>错误类型</span><select {...form.register("errorType")}><option value="">请选择</option>{ERROR_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <div className="knowledge-editor-block">
          <span className="field-label">关联知识点 <small>最多 3 个</small></span>
          <div className="knowledge-list">
            {knowledgePoints.map((point, index) => (
              <span key={`${point.name}-${index}`}>
                {point.subject} › {point.chapter || "未分类章节"} › {point.name}
                <button type="button" onClick={() => setKnowledgePoints((items) => items.filter((_, i) => i !== index))}>×</button>
              </span>
            ))}
          </div>
          {knowledgePoints.length < 3 && (
            <div className="knowledge-add">
              <input value={chapterDraft} onChange={(event) => setChapterDraft(event.target.value)} placeholder="章节（可选）" />
              <input
                value={pointDraft}
                onChange={(event) => setPointDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") { event.preventDefault(); addKnowledgePoint(); }
                }}
                placeholder="知识点名称"
              />
              <button className="button" type="button" onClick={addKnowledgePoint}>添加</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
