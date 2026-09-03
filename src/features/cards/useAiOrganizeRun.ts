import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getDefaultAcceptedFields, type ProposalKey } from "../../domain/ai";
import { aiOrganizeRuns } from "./aiOrganizeRun";

export function useAiOrganizeRun(key: string) {
  const [acceptedFields, setAcceptedFields] = useState<ProposalKey[]>([]);
  const subscribe = useCallback(
    (listener: () => void) => aiOrganizeRuns.subscribe(key, listener), [key],
  );
  const getSnapshot = useCallback(() => aiOrganizeRuns.get(key), [key]);
  const aiRun = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (aiRun.status === "succeeded") setAcceptedFields(
      getDefaultAcceptedFields(aiRun.input, aiRun.proposal));
  }, [aiRun]);
  return {
    aiRun, acceptedFields, setAcceptedFields,
    progress: aiRun.status === "running" ? aiRun.progress : null,
    proposal: aiRun.status === "succeeded" ? aiRun.proposal : null,
    proposalBase: aiRun.status === "idle" ? null : aiRun.input,
  };
}
