import { useState } from "react";
import type { Card } from "../../domain/card";
import type { KnowledgeSelection } from "./knowledgeTree";
import type { LibraryView } from "./KnowledgeWorkspaceContext";
import { RelatedCardsView } from "./RelatedCardsView";
import { ReviewView } from "./ReviewView";
import { practiceCardsForSelection } from "./reviewCards";

type Props = {
  allCards: Card[]; cards: Card[]; savedPracticeCards: Card[];
  selection: KnowledgeSelection | null; loading: boolean; error?: unknown;
  onSelectionChange: (selection: KnowledgeSelection | null) => void;
  onOpenCard: (id: string) => void; onCreateCard: () => void;
  view?: LibraryView; onViewChange?: (view: LibraryView) => void;
};

export function KnowledgeContextView(props: Props) {
  const [localView, setLocalView] = useState<LibraryView>("cards");
  const view = props.view ?? localView, setView = props.onViewChange ?? setLocalView;
  const practices = practiceCardsForSelection(props.savedPracticeCards, props.selection);
  return <div className="cards-results">
    <div className="learning-tabs" role="tablist" aria-label="卡片内容">
      <button type="button" role="tab" aria-selected={view === "cards"} className={view === "cards" ? "active" : ""}
        onClick={() => setView("cards")}>关联错题 <small>{props.cards.length}</small></button>
      <button type="button" role="tab" aria-selected={view === "review"} className={view === "review" ? "active" : ""}
        onClick={() => setView("review")}>错因复习 <small>{practices.length}</small></button>
    </div>
    {view === "cards" ? <RelatedCardsView cards={props.cards} loading={props.loading} error={props.error}
      filtered={Boolean(props.selection)} onOpen={props.onOpenCard} onCreate={props.onCreateCard} />
      : <ReviewView allCards={props.allCards} initialSelection={props.selection}
        savedCards={props.savedPracticeCards} onOpenCard={props.onOpenCard} />}
  </div>;
}
