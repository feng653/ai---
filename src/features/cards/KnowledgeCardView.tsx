import { Check, FilePenLine, LoaderCircle, Save, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { MathContent } from "../../components/MathContent";
import type {
  GeneratedKnowledgeCard, KnowledgeCardGenerationRequest, KnowledgeCardRecord, KnowledgeCardStatus,
} from "../../domain/ai";
import { errorMessage } from "../../services/errorMessage";
import { UNCATEGORIZED_CHAPTER_FILTER } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import type { KnowledgeCardContent } from "./learningContent";
import {
  initialKnowledgeProgress, knowledgeGenerationRuns,
} from "./learningGenerationRun";
import {
  useKnowledgeGenerationRun, useKnowledgeGenerationRunsVersion,
} from "./useLearningGenerationRun";
import { AiRequirementsField } from "./AiRequirementsField";

type Props = {
  cards: KnowledgeCardContent[];
  detail: KnowledgeCardContent | null;
  records: Record<string, KnowledgeCardRecord>;
  persistenceBusy: boolean;
  onPersist: (
    card: KnowledgeCardContent, generated: GeneratedKnowledgeCard, status: KnowledgeCardStatus,
  ) => Promise<KnowledgeCardRecord>;
  onDiscard: (key: string) => Promise<void>;
  onSelect: (selection: KnowledgeSelection) => void;
  onOpenSource: (id: string) => void;
};

function sourcesCurrent(card: KnowledgeCardContent, generated: GeneratedKnowledgeCard) {
  return generated?.sourceRevisions.length === card.sources.length
    && generated.sourceRevisions.every((item) => card.sources.some((source) =>
      source.id === item.cardId && source.revision === item.revision));
}

function generationRequest(
  card: KnowledgeCardContent, additionalRequirements: string,
): KnowledgeCardGenerationRequest {
  return {
    topic: {
      subject: card.selection.subject,
      chapter: card.selection.chapter === UNCATEGORIZED_CHAPTER_FILTER ? null : card.selection.chapter,
      name: card.selection.point!,
    },
    ...(additionalRequirements.trim()
      ? { additionalRequirements: additionalRequirements.trim() } : {}),
    sourceCards: card.sources.map((source) => ({
      id: source.id, revision: source.revision, question: source.question,
      userAnswer: source.userAnswer, correctAnswer: source.correctAnswer, solution: source.solution,
      errorLocation: source.errorLocation, errorReason: source.errorReason,
      knowledgePoints: source.knowledgePoints,
    })),
  };
}

function SourceList({ card, onOpen }: { card: KnowledgeCardContent; onOpen: (id: string) => void }) {
  return <details className="learning-sources"><summary>查看 {card.sources.length} 张来源错题</summary>
    <div>{card.sources.map((source, index) => <button type="button" key={source.id} onClick={() => onOpen(source.id)}>
      <span>{index + 1}</span>{source.question || "仅保存了题目图片"}
    </button>)}</div>
  </details>;
}

export function KnowledgeCardView({
  cards, detail, records, persistenceBusy, onPersist, onDiscard, onSelect, onOpenSource,
}: Props) {
  const [persistenceError, setPersistenceError] = useState("");
  const [requirementsByKey, setRequirementsByKey] = useState<Record<string, string>>({});
  const runKey = detail?.selection.key ?? "knowledge:none";
  const additionalRequirements = requirementsByKey[runKey] ?? "";
  const run = useKnowledgeGenerationRun(runKey);
  useKnowledgeGenerationRunsVersion();
  const persistedRecord = detail ? records[detail.selection.key] : undefined;
  const generatedRecord = run.status === "succeeded" ? run.result : undefined;
  const currentRecord = generatedRecord && (!persistedRecord
    || generatedRecord.updatedAt >= persistedRecord.updatedAt) ? generatedRecord : persistedRecord;
  const currentGenerated = currentRecord?.content;
  const currentSources = detail && currentGenerated ? sourcesCurrent(detail, currentGenerated) : true;
  const progress = run.status === "running" ? run.progress : null;
  const generationError = persistenceError || (run.status === "failed" ? run.message : "");

  const generate = () => {
    if (!detail || progress) return;
    setPersistenceError("");
    knowledgeGenerationRuns.start(detail.selection.key, {
      key: detail.selection.key,
      subject: detail.selection.subject,
      chapter: detail.selection.chapter === UNCATEGORIZED_CHAPTER_FILTER
        ? null : detail.selection.chapter,
      name: detail.selection.point!,
      request: generationRequest(detail, additionalRequirements),
    }, initialKnowledgeProgress);
  };

  const save = async () => {
    if (!detail || !currentGenerated || !currentSources || persistenceBusy) return;
    setPersistenceError("");
    try {
      await onPersist(detail, currentGenerated, "saved");
      knowledgeGenerationRuns.dismiss(detail.selection.key);
    } catch (error) {
      setPersistenceError(errorMessage(error, "知识卡片保存失败，草稿仍保留"));
    }
  };

  const discard = async () => {
    if (!detail || !currentRecord || persistenceBusy
      || !window.confirm("确定放弃这份知识卡片草稿吗？")) return;
    setPersistenceError("");
    try {
      await onDiscard(detail.selection.key);
      knowledgeGenerationRuns.dismiss(detail.selection.key);
    } catch (error) {
      setPersistenceError(errorMessage(error, "知识卡片草稿删除失败"));
    }
  };

  if (detail) return <section className="knowledge-card-detail">
    <header className="learning-view-heading"><span>知</span><div>
      <small>{detail.selection.subject} / {detail.selection.chapter} · 随来源错题自动更新</small>
      <h3>{detail.selection.point} · 知识卡片</h3>
    </div><button type="button" className="knowledge-generate-button"
      disabled={Boolean(progress) || persistenceBusy} onClick={generate}>
      {progress ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}
      {progress ? "生成中…" : currentGenerated ? "重新生成" : "AI 生成"}
    </button></header>
    <AiRequirementsField id="knowledge-card-ai-requirements"
      value={additionalRequirements}
      onChange={(value) => setRequirementsByKey((current) => ({ ...current, [runKey]: value }))}
      disabled={Boolean(progress) || persistenceBusy}
      placeholder="例如：优先总结判断步骤，并对比我混淆的两个公式" />
    {progress && <p className="knowledge-generation-status" role="status">
      {progress.message} 可以离开此页，完成后会自动保存为待审核草稿。
    </p>}
    {generationError && <p className="knowledge-generation-error" role="alert">{generationError}</p>}
    {currentGenerated?.warnings.map((warning) => <p className="knowledge-generation-warning" key={warning}>{warning}</p>)}
    {currentRecord && <div className={`knowledge-draft-bar ${currentRecord.status}`}>
      <div>{currentRecord.status === "draft" ? <FilePenLine size={15} /> : <Check size={15} />}
        <span><strong>{currentRecord.status === "draft" ? "AI 草稿预览" : "已保存知识卡片"}</strong>
          <small>{!currentSources ? "来源错题已变化，请重新生成后再保存"
            : currentRecord.status === "draft" ? "草稿已自动保留，离开页面后仍可继续"
              : "内容已持久保存，可随时重新生成新草稿"}</small></span></div>
      {currentRecord.status === "draft" && <nav aria-label="知识卡片草稿操作">
        <button type="button" disabled={persistenceBusy} onClick={discard}><Trash2 size={14} />放弃草稿</button>
        <button type="button" className="primary" disabled={persistenceBusy || !currentSources} onClick={save}>
          {persistenceBusy ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}保存知识卡片
        </button>
      </nav>}
    </div>}
    <div className="knowledge-evidence"><span><b>{detail.sources.length}</b>道来源错题</span>
      <span><b>{detail.mistakes.length}</b>个错误样本</span><span><b>{detail.coverage}</b>内容状态</span></div>
    <section className="learning-section"><em>01</em><div><h4>核心方法</h4>
      {(currentGenerated ? [currentGenerated.coreMethod] : detail.coreMethods)
        .map((method) => <MathContent key={method}>{method}</MathContent>)}</div></section>
    <section className="learning-section mistake-section"><em>02</em><div><h4>你的易错提醒</h4>
      {currentGenerated ? <MathContent>{currentGenerated.mistakeReminder}</MathContent> : detail.mistakes.map((mistake) => <article key={mistake.cardId}>
        <strong>{mistake.content}</strong><MathContent>{mistake.question}</MathContent>
      </article>)}</div></section>
    <SourceList card={detail} onOpen={onOpenSource} />
  </section>;

  if (!cards.length) return <div className="learning-empty"><strong>还没有可生成的知识卡片</strong>
    <span>为错题关联具体知识点后，这里会按知识点自动汇总。</span></div>;
  return <section className="knowledge-card-grid" aria-label="知识卡片">
    {cards.map((card) => {
      const cardRun = knowledgeGenerationRuns.get(card.selection.key);
      const runRecord = cardRun.status === "succeeded" ? cardRun.result : undefined;
      const record = runRecord && (!records[card.selection.key]
        || runRecord.updatedAt >= records[card.selection.key].updatedAt)
        ? runRecord : records[card.selection.key];
      const status = cardRun.status === "running" ? "生成中"
        : cardRun.status === "failed" ? "生成失败"
          : record?.status === "draft" ? "待审核" : record ? "已保存" : card.coverage;
      return <article key={card.selection.key}>
      <header><span>{card.selection.subject} / {card.selection.chapter}</span>
        <em>{status}</em></header>
      <h3>{card.selection.point}</h3><MathContent className="knowledge-card-preview">
        {record?.content.coreMethod ?? card.preview}
      </MathContent>
      <div><span><b>{card.sources.length}</b> 道错题</span><span><b>{card.mistakes.length}</b> 个错误样本</span></div>
      <footer><span>一知识点一张卡</span><button type="button" onClick={() => onSelect(card.selection)}>查看知识卡片 →</button></footer>
    </article>; })}
  </section>;
}
