import { LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { PracticeGenerationRequest } from "../../domain/ai";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import { initialPracticeProgress, practiceGenerationRuns } from "./learningGenerationRun";
import { practiceCardsForSelection } from "./reviewCards";
import { ReviewBuilder } from "./ReviewBuilder";
import { ReviewCardList } from "./ReviewCardList";
import { usePracticeGenerationRun } from "./useLearningGenerationRun";

type Props = {
  allCards: Card[];
  initialSelection: KnowledgeSelection | null;
  savedCards: Card[];
  onOpenCard: (id: string) => void;
};

const practiceRunKey = "practice-generator";

export function ReviewView({ allCards, initialSelection, savedCards, onOpenCard }: Props) {
  const [mode, setMode] = useState<"cards" | "setup">("cards");
  const run = usePracticeGenerationRun(practiceRunKey);
  const latest = run.status === "succeeded" ? run.result : [];
  const cards = useMemo(() => {
    const merged = [...latest, ...savedCards.filter((card) => !latest.some((item) => item.id === card.id))];
    return practiceCardsForSelection(merged, initialSelection);
  }, [initialSelection, latest, savedCards]);
  const recentIds = useMemo(() => new Set(latest.map((card) => card.id)), [latest]);

  const generate = (request: PracticeGenerationRequest) => {
    setMode("cards");
    practiceGenerationRuns.start(practiceRunKey, request, initialPracticeProgress);
  };

  if (run.status === "running") return <section className="practice-generation" role="status">
    <span><LoaderCircle className="spin" aria-hidden="true" /></span><small>AI 正在生成复习题</small>
    <h2>{run.progress.message}</h2>
    <i />
  </section>;
  if (mode === "setup" || run.status === "failed") return <ReviewBuilder
    allCards={allCards} initialSelection={initialSelection}
    error={run.status === "failed" ? run.message : ""}
    onCancel={() => { practiceGenerationRuns.dismiss(practiceRunKey); setMode("cards"); }}
    onGenerate={generate} />;
  return <ReviewCardList cards={cards} recentIds={recentIds} onOpenCard={onOpenCard}
    onGenerate={() => setMode("setup")} />;
}
