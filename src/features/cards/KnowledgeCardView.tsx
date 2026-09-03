import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { MathContent } from "../../components/MathContent";
import type { GeneratedKnowledgeCard, KnowledgeCardGenerationRequest } from "../../domain/ai";
import { aiService, type AiProgress } from "../../services/aiService";
import { errorMessage } from "../../services/errorMessage";
import { UNCATEGORIZED_CHAPTER_FILTER } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import type { KnowledgeCardContent } from "./learningContent";

type Props = {
  cards: KnowledgeCardContent[];
  detail: KnowledgeCardContent | null;
  generatedCards: Record<string, GeneratedKnowledgeCard>;
  onGenerated: (key: string, generated: GeneratedKnowledgeCard) => void;
  onSelect: (selection: KnowledgeSelection) => void;
  onOpenSource: (id: string) => void;
};

function currentDraft(card: KnowledgeCardContent, generated?: GeneratedKnowledgeCard) {
  return generated?.sourceRevisions.length === card.sources.length
    && generated.sourceRevisions.every((item) => card.sources.some((source) =>
      source.id === item.cardId && source.revision === item.revision)) ? generated : undefined;
}

function generationRequest(card: KnowledgeCardContent): KnowledgeCardGenerationRequest {
  return {
    topic: {
      subject: card.selection.subject,
      chapter: card.selection.chapter === UNCATEGORIZED_CHAPTER_FILTER ? null : card.selection.chapter,
      name: card.selection.point!,
    },
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
  cards, detail, generatedCards, onGenerated, onSelect, onOpenSource,
}: Props) {
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [generationError, setGenerationError] = useState("");
  const currentGenerated = detail ? currentDraft(detail, generatedCards[detail.selection.key]) : undefined;

  const generate = async () => {
    if (!detail || progress) return;
    setGenerationError("");
    setProgress({ stage: "preparing", message: "正在连接 AI…" });
    try {
      let status = await aiService.getStatus();
      if (status.state !== "connected") status = await aiService.connect();
      if (status.state !== "connected") throw new Error(status.message || "AI 当前不可用");
      const next = await aiService.generateKnowledgeCard(generationRequest(detail), setProgress);
      onGenerated(detail.selection.key, next);
    } catch (error) {
      setGenerationError(errorMessage(error, "知识卡片生成失败，原内容已保留"));
    } finally {
      setProgress(null);
    }
  };

  if (detail) return <section className="knowledge-card-detail">
    <header className="learning-view-heading"><span>知</span><div>
      <small>{detail.selection.subject} / {detail.selection.chapter} · 随来源错题自动更新</small>
      <h3>{detail.selection.point} · 知识卡片</h3>
    </div><button type="button" className="knowledge-generate-button" disabled={Boolean(progress)} onClick={generate}>
      {progress ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}
      {progress ? "生成中…" : currentGenerated ? "重新生成" : "AI 生成"}
    </button></header>
    {progress && <p className="knowledge-generation-status" role="status">{progress.message}</p>}
    {generationError && <p className="knowledge-generation-error" role="alert">{generationError}</p>}
    {currentGenerated?.warnings.map((warning) => <p className="knowledge-generation-warning" key={warning}>{warning}</p>)}
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
    {cards.map((card) => <article key={card.selection.key}>
      <header><span>{card.selection.subject} / {card.selection.chapter}</span><em>{card.coverage}</em></header>
      <h3>{card.selection.point}</h3><MathContent className="knowledge-card-preview">
        {currentDraft(card, generatedCards[card.selection.key])?.coreMethod ?? card.preview}
      </MathContent>
      <div><span><b>{card.sources.length}</b> 道错题</span><span><b>{card.mistakes.length}</b> 个错误样本</span></div>
      <footer><span>一知识点一张卡</span><button type="button" onClick={() => onSelect(card.selection)}>查看知识卡片 →</button></footer>
    </article>)}
  </section>;
}
