import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cardKeys } from "../../hooks/useCards";
import { practiceGenerationRuns } from "./learningGenerationRun";
import { useBackgroundAiRun } from "./useBackgroundAiRun";

export function usePracticeGenerationRun(key: string) {
  const client = useQueryClient();
  const syncedOperation = useRef("");
  const run = useBackgroundAiRun(practiceGenerationRuns, key);
  useEffect(() => {
    if (run.status !== "succeeded" || syncedOperation.current === run.operationId) return;
    syncedOperation.current = run.operationId;
    void client.invalidateQueries({ queryKey: cardKeys.all });
  }, [client, run]);
  return run;
}
