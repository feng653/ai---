import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCards } from "../../hooks/useCards";
import { KnowledgeContextView } from "./KnowledgeContextView";
import { KnowledgeTreeFilter } from "./KnowledgeTreeFilter";
import type { KnowledgeSelection } from "./knowledgeTree";

export function CardsPage() {
  const navigate = useNavigate();
  const [knowledge, setKnowledge] = useState<KnowledgeSelection | null>(null);
  const allCards = useCards({});
  const cards = useCards({
    knowledgeSubject: knowledge?.subject,
    knowledgeChapter: knowledge?.chapter, knowledgePoint: knowledge?.point,
  });
  return (
    <div className="page-content cards-page">
      <section className="cards-library-layout">
        <KnowledgeTreeFilter cards={allCards.data ?? []} selection={knowledge} onChange={setKnowledge} />
        <KnowledgeContextView allCards={allCards.data ?? []} cards={cards.data ?? []} selection={knowledge}
          loading={cards.isLoading} error={cards.isError ? cards.error : undefined} onSelectionChange={setKnowledge}
          onOpenCard={(id) => navigate(`/cards/${id}`)} onCreateCard={() => navigate("/cards/new")} />
      </section>
    </div>
  );
}
