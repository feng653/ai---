import { ArrowLeft, Cloud, LoaderCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { applyAiProposal, type ProposalKey } from "../../domain/ai";
import { emptyCardInput, validateCardInput, type CardAsset, type CardInput, type KnowledgePoint } from "../../domain/card";
import { useAiStatus, useConnectAi } from "../../hooks/useAi";
import { useCard, useCards, useDeleteCard, useSaveCard } from "../../hooks/useCards";
import { cardService } from "../../services/cardService";
import { errorMessage as getErrorMessage } from "../../services/errorMessage";
import { AiReviewPanel } from "./AiReviewPanel";
import { aiOrganizeRuns } from "./aiOrganizeRun";
import { CardEditorFields, type CardFormValues } from "./CardEditorFields";
import { comparableInput, formValues, scalarKeys, storableAssets } from "./cardEditorModel";
import { NewCardLeaveDialog } from "./NewCardLeaveDialog";
import { ImageEditorDialog } from "../images/ImageEditorDialog";
import { useImageImport } from "../images/useImageImport";
import { useAiOrganizeRun } from "./useAiOrganizeRun";
import { useNewCardLeave } from "./useNewCardLeave";

export function CardEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardQuery = useCard(id);
  const availableCards = useCards({ kind: "mistake" });
  const saveCard = useSaveCard();
  const deleteCard = useDeleteCard();
  const aiStatus = useAiStatus();
  const connectAi = useConnectAi();
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [assets, setAssets] = useState<CardAsset[]>([]);
  const [chapterDraft, setChapterDraft] = useState("");
  const [pointDraft, setPointDraft] = useState("");
  const [additionalRequirements, setAdditionalRequirements] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [conflictMessage, setConflictMessage] = useState("");
  const [draftStatus, setDraftStatus] = useState("尚未修改");
  const initialized = useRef(false);
  const draftKey = `zhishi.editor-draft.${id ?? "new"}`;
  const aiRunKey = `card-editor:${id ?? "new"}`;
  const { aiRun, progress, proposal, proposalBase,
    acceptedFields, setAcceptedFields } = useAiOrganizeRun(aiRunKey);
  const form = useForm<CardFormValues>({ defaultValues: formValues(emptyCardInput()) });
  const watched = form.watch();
  const imageImport = useImageImport(setAssets, setErrorMessage);

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
          setDraftStatus("已恢复草稿");
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

  const currentInput = useMemo<CardInput>(
    () => ({ ...watched, knowledgePoints, assets }), [assets, knowledgePoints, watched],
  );
  const baseline = id && cardQuery.data
    ? ({ ...formValues(cardQuery.data), knowledgePoints: cardQuery.data.knowledgePoints, assets: cardQuery.data.assets } as CardInput)
    : emptyCardInput();
  const hasUnsavedChanges = JSON.stringify(comparableInput(currentInput)) !== JSON.stringify(comparableInput(baseline));
  const draftSnapshot = useMemo(() => JSON.stringify({ values: watched, knowledgePoints,
    assets: storableAssets(assets), baseRevision: cardQuery.data?.revision }),
  [assets, cardQuery.data?.revision, knowledgePoints, watched]);
  const newCardLeave = useNewCardLeave({
    input: currentInput, draftKey, aiRunKey,
    saveCard: (request) => saveCard.mutateAsync(request),
    onError: setErrorMessage, onLeave: () => navigate("/"),
  });

  useEffect(() => {
    if (!initialized.current || !hasUnsavedChanges) return;
    setDraftStatus("正在暂存");
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey, draftSnapshot);
      setDraftStatus("草稿已保留");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draftKey, draftSnapshot, hasUnsavedChanges]);

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
    if (!id) { newCardLeave.request(); return; }
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
    setConflictMessage("");
    try {
      const saved = await saveCard.mutateAsync({ id, input, expectedRevision: cardQuery.data?.revision });
      const savedIds = new Set(saved.assets.map((asset) => asset.id));
      await Promise.allSettled((cardQuery.data?.assets ?? [])
        .filter((asset) => !savedIds.has(asset.id)).map((asset) => cardService.deleteAsset(asset.id)));
      if (!id) aiOrganizeRuns.move(aiRunKey, `card-editor:${saved.id}`);
      localStorage.removeItem(draftKey);
      navigate(`/cards/${saved.id}`);
    } catch (error) {
      const message = getErrorMessage(error, "保存失败");
      if (message.includes("REVISION_CONFLICT") || message.includes("版本")) setConflictMessage(message);
      else setErrorMessage(message);
    }
  });

  const handleDelete = async () => {
    if (!id || !window.confirm("删除后无法恢复，确认删除这张错题吗？")) return;
    try {
      await deleteCard.mutateAsync(id);
      localStorage.removeItem(draftKey);
      navigate("/");
    } catch (error) { setErrorMessage(getErrorMessage(error, "删除失败，请重试")); }
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
      setAcceptedFields([]);
      aiOrganizeRuns.start(aiRunKey, base, cardQuery.data?.revision ?? 0, additionalRequirements);
    } catch (error) { setErrorMessage(getErrorMessage(error, "AI 整理失败，原始内容已保留")); }
  };

  const applyProposal = () => {
    if (!proposal) return;
    const next = applyAiProposal(currentInput, proposal, acceptedFields);
    for (const key of scalarKeys) form.setValue(key, next[key], { shouldDirty: true });
    setKnowledgePoints(next.knowledgePoints);
    aiOrganizeRuns.dismiss(aiRunKey);
    setAcceptedFields([]);
  };

  const isFieldConflict = (key: ProposalKey) => proposalBase
    ? JSON.stringify(proposalBase[key]) !== JSON.stringify(currentInput[key]) : false;

  if (id && cardQuery.isLoading) return <div className="page-content"><div className="empty-state"><span className="loading-spinner" /></div></div>;
  if (id && !cardQuery.data) return <div className="page-content"><div className="empty-state"><h3>找不到这张错题</h3></div></div>;

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div><button className="button ghost" type="button" onClick={closeEditor}><ArrowLeft size={17} />返回</button><h1>{id ? "编辑错题" : "整理一道错题"}</h1><p>先保存原始材料，也可以稍后再整理。</p></div>
        <div className="editor-actions">
          <span className="draft-state" role="status"><Cloud size={12} />{draftStatus}</span>
          {id && <button className="button danger ghost" type="button" onClick={handleDelete}><Trash2 size={16} />删除</button>}
          <button className="button primary" type="button" onClick={handleSave} disabled={saveCard.isPending}>{saveCard.isPending ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}保存卡片</button>
        </div>
      </header>
      <form className="editor-layout" onSubmit={handleSave}>
        <div className="editor-main">
          {conflictMessage && <div className="conflict-banner" role="alert"><div><strong>检测到版本冲突</strong>
            <span>{conflictMessage}。当前草稿仍保留。</span></div><button type="button" className="button"
              onClick={() => window.location.reload()}><RefreshCw size={14} />重新载入</button></div>}
          {errorMessage && <div className="inline-error" role="alert">{errorMessage}</div>}
          <CardEditorFields form={form} assets={assets} knowledgePoints={knowledgePoints}
            availableCards={availableCards.data ?? []}
            chapterDraft={chapterDraft} pointDraft={pointDraft} fileInput={imageImport.fileInput}
            setChapterDraft={setChapterDraft} setPointDraft={setPointDraft}
            setKnowledgePoints={setKnowledgePoints} addKnowledgePoint={addKnowledgePoint}
            selectImage={imageImport.selectImage} removeAsset={removeAsset} />
        </div>
        <AiReviewPanel progress={progress} proposal={proposal} acceptedFields={acceptedFields}
          runError={aiRun.status === "failed" ? aiRun.message : null}
          connected={aiStatus.data?.state === "connected"} connecting={connectAi.isPending}
          additionalRequirements={additionalRequirements}
          setAdditionalRequirements={setAdditionalRequirements}
          setAcceptedFields={setAcceptedFields} isFieldConflict={isFieldConflict}
          organize={organize} applyProposal={applyProposal}
          dismissRun={() => aiOrganizeRuns.dismiss(aiRunKey)} />
      </form>
      {imageImport.pendingImage && (
        <ImageEditorDialog
          file={imageImport.pendingImage}
          onCancel={imageImport.cancelImageEdit}
          onConfirm={imageImport.importEditedImage}
        />
      )}
      <NewCardLeaveDialog open={newCardLeave.open} aiRunning={aiRun.status === "running"}
        saving={newCardLeave.saving} canSave={newCardLeave.canSave}
        onCancel={newCardLeave.cancel} onDiscard={newCardLeave.discard} onSave={newCardLeave.save} />
    </div>
  );
}
