import { useEffect, useMemo, useState } from "react";
import type { GeneratedKnowledgeCard, KnowledgeCardStatus } from "../../domain/ai";
import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import {
  useDeleteKnowledgeCard, useKnowledgeCards, useSaveKnowledgeCard,
} from "../../hooks/useKnowledgeCards";
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
  const persisted = useKnowledgeCards();
  const saveKnowledgeCard = useSaveKnowledgeCard();
  const deleteKnowledgeCard = useDeleteKnowledgeCard();
  const knowledgeCards = useMemo(() => buildKnowledgeCards(allCards, selection), [allCards, selection]);
  const detail = useMemo(() => buildKnowledgeCard(allCards, selection), [allCards, selection]);
  const reviewReady = knowledgeCards.length > 0;
  const records = useMemo(() => Object.fromEntries(
    (persisted.data ?? []).map((record) => [record.key, record]),
  ), [persisted.data]);

  const persist = (
    card: NonNullable<typeof detail>, content: GeneratedKnowledgeCard, status: KnowledgeCardStatus,
  ) => saveKnowledgeCard.mutateAsync({
    key: card.selection.key,
    subject: card.selection.subject,
    chapter: card.selection.chapter === UNCATEGORIZED_CHAPTER_FILTER ? null : card.selection.chapter,
    name: card.selection.point!,
    status,
    content,
  });

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
      records={records} persistenceBusy={saveKnowledgeCard.isPending || deleteKnowledgeCard.isPending}
      onPersist={persist} onDiscard={(key) => deleteKnowledgeCard.mutateAsync(key)}
      onSelect={onSelectionChange} onOpenSource={onOpenCard} />}
    {view === "review" && <ReviewView allCards={allCards} initialSelection={selection}
      savedCards={savedPracticeCards} onOpenSource={onOpenCard} onSave={onSavePractice} />}
  </div>;
}
