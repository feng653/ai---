import { useEffect, useMemo, useState } from "react";
import type { GeneratedKnowledgeCard } from "../../domain/ai";
import type { Card } from "../../domain/card";
import type { PracticeCardDraft } from "../../services/cardService";
import { KnowledgeCardView } from "./KnowledgeCardView";
import type { KnowledgeSelection } from "./knowledgeTree";
import { buildKnowledgeCard, buildKnowledgeCards } from "./learningContent";
import { RelatedCardsView } from "./RelatedCardsView";
import { ReviewView } from "./ReviewView";

type View = "cards" | "knowledge" | "review";
type Props = {
  allCards: Card[];
  cards: Card[];
  savedPracticeCards: Card[];
  selection: KnowledgeSelection | null;
  loading: boolean;
  error?: unknown;
  onSelectionChange: (selection: KnowledgeSelection | null) => void;
  onOpenCard: (id: string) => void;
  onCreateCard: () => void;
  onSavePractice: (drafts: PracticeCardDraft[]) => Promise<Card[]>;
};

export function KnowledgeContextView(props: Props) {
  const {
    allCards, cards, savedPracticeCards, selection, loading, error,
    onSelectionChange, onOpenCard, onCreateCard, onSavePractice,
  } = props;
  const [view, setView] = useState<View>("cards");
  const [generatedCards, setGeneratedCards] = useState<Record<string, GeneratedKnowledgeCard>>({});
  const knowledgeCards = useMemo(() => buildKnowledgeCards(allCards, selection), [allCards, selection]);
  const detail = useMemo(() => buildKnowledgeCard(allCards, selection), [allCards, selection]);
  const reviewReady = knowledgeCards.length > 0;

  useEffect(() => {
    if (view === "review" && !reviewReady) setView("knowledge");
  }, [reviewReady, view]);

  return <div className="cards-results">
    <div className="learning-tabs" role="tablist" aria-label="知识点内容">
      <button type="button" role="tab" aria-selected={view === "cards"} className={view === "cards" ? "active" : ""}
        onClick={() => setView("cards")}>关联错题 <small>{cards.length}</small></button>
      <button type="button" role="tab" aria-selected={view === "knowledge"} className={view === "knowledge" ? "active" : ""}
        onClick={() => setView("knowledge")}>知识卡片 <small>{knowledgeCards.length}</small></button>
      <button type="button" role="tab" aria-selected={view === "review"} className={view === "review" ? "active" : ""}
        disabled={!reviewReady} onClick={() => setView("review")}>复习题 <small>{savedPracticeCards.length}</small></button>
      <span>{selection?.point ? `${cards.length} 道错题用于当前知识点` : `当前范围包含 ${knowledgeCards.length} 张知识卡片`}</span>
    </div>
    {view === "cards" && <RelatedCardsView cards={cards} loading={loading} error={error}
      filtered={Boolean(selection)} onOpen={onOpenCard} onCreate={onCreateCard} />}
    {view === "knowledge" && <KnowledgeCardView cards={knowledgeCards} detail={detail}
      generatedCards={generatedCards}
      onGenerated={(key, generated) => setGeneratedCards((current) => ({ ...current, [key]: generated }))}
      onSelect={onSelectionChange} onOpenSource={onOpenCard} />}
    {view === "review" && <ReviewView allCards={allCards} initialSelection={selection}
      savedCards={savedPracticeCards} onOpenSource={onOpenCard} onSave={onSavePractice} />}
  </div>;
}
