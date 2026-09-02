import { ArrowLeft, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { applyAiProposal, getDefaultAcceptedFields, type AiProposal, type ProposalKey } from "../../domain/ai";
import { emptyCardInput, validateCardInput, type CardAsset, type CardInput, type KnowledgePoint } from "../../domain/card";
import { useAiStatus, useConnectAi } from "../../hooks/useAi";
import { useCard, useDeleteCard, useSaveCard } from "../../hooks/useCards";
import { aiService, type AiProgress } from "../../services/aiService";
import { cardService } from "../../services/cardService";
import { errorMessage as getErrorMessage } from "../../services/errorMessage";
import { AiReviewPanel } from "./AiReviewPanel";
import { CardEditorFields, type CardFormValues } from "./CardEditorFields";

const scalarKeys: (keyof CardFormValues)[] = [
  "subject", "question", "userAnswer", "correctAnswer", "supplementalNote",
  "solution", "errorLocation", "errorReason", "errorType",
];

function formValues(input: CardInput): CardFormValues {
  return Object.fromEntries(scalarKeys.map((key) => [key, input[key]])) as CardFormValues;
}

function storableAssets(assets: CardAsset[]): CardAsset[] {
  return assets.map((asset) => asset.previewUrl?.startsWith("blob:")
    ? { ...asset, previewUrl: undefined }
    : asset);
}

function comparableInput(input: CardInput): CardInput {
  return { ...input, assets: storableAssets(input.assets) };
}

export function CardEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardQuery = useCard(id);
  const saveCard = useSaveCard();
  const deleteCard = useDeleteCard();
  const aiStatus = useAiStatus();
  const connectAi = useConnectAi();
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [assets, setAssets] = useState<CardAsset[]>([]);
  const [chapterDraft, setChapterDraft] = useState("");
  const [pointDraft, setPointDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [acceptedFields, setAcceptedFields] = useState<ProposalKey[]>([]);
  const [proposalBase, setProposalBase] = useState<CardInput | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const draftKey = `zhishi.editor-draft.${id ?? "new"}`;
  const form = useForm<CardFormValues>({ defaultValues: formValues(emptyCardInput()) });
  const watched = form.watch();

  useEffect(() => {
    if (initialized.current || (id && cardQuery.isLoading)) return;
    const base = id ? cardQuery.data : emptyCardInput();
    if (!base) return;
    let restored = false;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as {
          values: CardFormValues; knowledgePoints: KnowledgePoint[];
          assets?: CardAsset[]; baseRevision?: number;
        };
        if (!id || draft.baseRevision === cardQuery.data?.revision) {
          form.reset(draft.values);
          setKnowledgePoints(draft.knowledgePoints ?? []);
          setAssets(draft.assets ?? []);
          restored = true;
        } else localStorage.removeItem(draftKey);
      } catch { localStorage.removeItem(draftKey); }
    }
    if (!restored) {
      form.reset(formValues(base));
      setKnowledgePoints(base.knowledgePoints);
      setAssets(base.assets);
    }
    initialized.current = true;
  }, [cardQuery.data, cardQuery.isLoading, draftKey, form, id]);

  useEffect(() => {
    if (!initialized.current) return;
    const timer = window.setTimeout(() => localStorage.setItem(draftKey, JSON.stringify({
      values: watched, knowledgePoints, assets: storableAssets(assets),
      baseRevision: cardQuery.data?.revision,
    })), 700);
    return () => window.clearTimeout(timer);
  }, [assets, cardQuery.data?.revision, draftKey, knowledgePoints, watched]);

  const currentInput = useMemo<CardInput>(
    () => ({ ...watched, knowledgePoints, assets }), [assets, knowledgePoints, watched],
  );
  const baseline = id && cardQuery.data
    ? ({ ...formValues(cardQuery.data), knowledgePoints: cardQuery.data.knowledgePoints, assets: cardQuery.data.assets } as CardInput)
    : emptyCardInput();
  const hasUnsavedChanges = JSON.stringify(comparableInput(currentInput)) !== JSON.stringify(comparableInput(baseline));

  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [hasUnsavedChanges]);

  const closeEditor = () => {
    if (hasUnsavedChanges && !window.confirm("当前修改已自动保存为草稿。确定离开吗？")) return;
    localStorage.setItem(draftKey, JSON.stringify({
      values: form.getValues(), knowledgePoints, assets: storableAssets(assets),
      baseRevision: cardQuery.data?.revision,
    }));
    navigate(id ? `/cards/${id}` : "/");
  };

  const addKnowledgePoint = () => {
    const name = pointDraft.trim();
    if (!name || knowledgePoints.length >= 3 || knowledgePoints.some((point) => point.name === name)) return;
    setKnowledgePoints((items) => [...items, {
      subject: form.getValues("subject") || "未分类", chapter: chapterDraft.trim() || null, name,
    }]);
    setPointDraft("");
  };

  const importImage = async (file?: File) => {
    if (!file) return;
    setErrorMessage("");
    try {
      const asset = await cardService.importAsset(file);
      setAssets((items) => [...items, asset]);
    }
    catch (error) { setErrorMessage(getErrorMessage(error, "图片导入失败")); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  };

  const removeAsset = async (asset: CardAsset) => {
    const saved = cardQuery.data?.assets.some((item) => item.id === asset.id);
    try {
      if (!saved) await cardService.deleteAsset(asset.id);
      setAssets((items) => items.filter((item) => item.id !== asset.id));
    } catch (error) { setErrorMessage(getErrorMessage(error, "图片删除失败")); }
  };

  const handleSave = form.handleSubmit(async (values) => {
    const input: CardInput = { ...values, knowledgePoints, assets: storableAssets(assets) };
    const errors = validateCardInput(input);
    if (errors.length) { setErrorMessage(errors.join("；")); return; }
    setErrorMessage("");
    try {
      const saved = await saveCard.mutateAsync({ id, input, expectedRevision: cardQuery.data?.revision });
      const savedIds = new Set(saved.assets.map((asset) => asset.id));
      await Promise.allSettled((cardQuery.data?.assets ?? [])
        .filter((asset) => !savedIds.has(asset.id)).map((asset) => cardService.deleteAsset(asset.id)));
      localStorage.removeItem(draftKey);
      navigate(`/cards/${saved.id}`);
    } catch (error) { setErrorMessage(getErrorMessage(error, "保存失败")); }
  });

  const handleDelete = async () => {
    if (!id || !window.confirm("删除后无法恢复，确认删除这张错题吗？")) return;
    await deleteCard.mutateAsync(id);
    localStorage.removeItem(draftKey);
    navigate("/");
  };

  const organize = async () => {
    if (!currentInput.question.trim() && currentInput.assets.length === 0) {
      setErrorMessage("请先输入题目或添加题目图片"); return;
    }
    setErrorMessage("");
    try {
      let status = aiStatus.data;
      if (status?.state !== "connected") status = await connectAi.mutateAsync();
      if (status.state !== "connected") throw new Error(status.message || "AI 当前不可用");
      const base = structuredClone(currentInput);
      setProposalBase(base);
      setProposal(null);
      const next = await aiService.organize(base, cardQuery.data?.revision ?? 0, setProgress);
      setProposal(next);
      setAcceptedFields(getDefaultAcceptedFields(base, next));
    } catch (error) { setErrorMessage(getErrorMessage(error, "AI 整理失败，原始内容已保留")); }
    finally { setProgress(null); }
  };

  const applyProposal = () => {
    if (!proposal) return;
    const next = applyAiProposal(currentInput, proposal, acceptedFields);
    for (const key of scalarKeys) form.setValue(key, next[key], { shouldDirty: true });
    setKnowledgePoints(next.knowledgePoints);
    setProposal(null);
    setAcceptedFields([]);
  };

  const isFieldConflict = (key: ProposalKey) => proposalBase
    ? JSON.stringify(proposalBase[key]) !== JSON.stringify(currentInput[key]) : false;

  if (id && cardQuery.isLoading) return <div className="page-content"><div className="empty-state"><span className="loading-spinner" /></div></div>;
  if (id && !cardQuery.data) return <div className="page-content"><div className="empty-state"><h3>找不到这张错题</h3></div></div>;

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div><button className="button ghost" type="button" onClick={closeEditor}><ArrowLeft size={17} />返回</button><h1>{id ? "编辑错题" : "新增错题"}</h1><p>先保存原始材料，也可以稍后再整理。</p></div>
        <div className="editor-actions">
          {id && <button className="button danger ghost" type="button" onClick={handleDelete}><Trash2 size={16} />删除</button>}
          <button className="button primary" type="button" onClick={handleSave} disabled={saveCard.isPending}>{saveCard.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}保存卡片</button>
        </div>
      </header>
      <form className="editor-layout" onSubmit={handleSave}>
        <div className="editor-main">
          {errorMessage && <div className="inline-error" role="alert">{errorMessage}</div>}
          <CardEditorFields form={form} assets={assets} knowledgePoints={knowledgePoints}
            chapterDraft={chapterDraft} pointDraft={pointDraft} fileInput={fileInput}
            setChapterDraft={setChapterDraft} setPointDraft={setPointDraft}
            setKnowledgePoints={setKnowledgePoints} addKnowledgePoint={addKnowledgePoint}
            importImage={importImage} removeAsset={removeAsset} />
        </div>
        <AiReviewPanel progress={progress} proposal={proposal} acceptedFields={acceptedFields}
          connected={aiStatus.data?.state === "connected"} connecting={connectAi.isPending}
          setProposal={setProposal} setAcceptedFields={setAcceptedFields}
          isFieldConflict={isFieldConflict} organize={organize} applyProposal={applyProposal} />
      </form>
    </div>
  );
}
