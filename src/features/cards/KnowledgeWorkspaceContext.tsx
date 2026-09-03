import { createContext, useContext } from "react";
import type { KnowledgeSelection } from "./knowledgeTree";

type KnowledgeWorkspaceState = {
  selection: KnowledgeSelection | null;
  setSelection: (selection: KnowledgeSelection | null) => void;
};

export const KnowledgeWorkspaceContext = createContext<KnowledgeWorkspaceState | null>(null);

export function useKnowledgeWorkspace(): KnowledgeWorkspaceState {
  const state = useContext(KnowledgeWorkspaceContext);
  if (!state) throw new Error("KnowledgeWorkspaceContext is missing");
  return state;
}
