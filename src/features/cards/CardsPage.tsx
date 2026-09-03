import { Search, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCards, useSavePracticeCards } from "../../hooks/useCards";
import { KnowledgeContextView } from "./KnowledgeContextView";
import { useKnowledgeWorkspace } from "./KnowledgeWorkspaceContext";

export function CardsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { selection, setSelection } = useKnowledgeWorkspace();
  const allCards = useCards({ kind: "mistake" });
  const cards = useCards({
    kind: "mistake", query,
    knowledgeSubject: selection?.subject,
    knowledgeChapter: selection?.chapter,
    knowledgePoint: selection?.point,
  });
  const practiceCards = useCards({ kind: "practice" });
  const savePracticeCards = useSavePracticeCards();

  return <div className="page-content cards-page">
    <header className="library-toolbar">
      <label className="library-search"><Search /><input value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索题目、错因或知识点" aria-label="搜索错题卡片" />
        {query && <button type="button" aria-label="清除卡片搜索" onClick={() => setQuery("")}><X /></button>}
      </label>
      <span><b>{cards.data?.length ?? 0}</b> 条内容</span>
    </header>
    <KnowledgeContextView allCards={allCards.data ?? []} cards={cards.data ?? []}
      savedPracticeCards={practiceCards.data ?? []} selection={selection}
      loading={cards.isLoading} error={cards.isError ? cards.error : undefined}
      onSelectionChange={setSelection} onOpenCard={(id) => navigate(`/cards/${id}`)}
      onCreateCard={() => navigate("/cards/new")}
      onSavePractice={(drafts) => savePracticeCards.mutateAsync(drafts)} />
  </div>;
}
