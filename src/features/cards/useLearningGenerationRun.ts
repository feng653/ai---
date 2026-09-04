import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { KnowledgeCardRecord } from "../../domain/ai";
import { cardKeys } from "../../hooks/useCards";
import { knowledgeCardKey } from "../../hooks/useKnowledgeCards";
import { knowledgeGenerationRuns, practiceGenerationRuns } from "./learningGenerationRun";
import { useBackgroundAiRun, useBackgroundAiRunsVersion } from "./useBackgroundAiRun";

export function useKnowledgeGenerationRun(key: string) {
  const client = useQueryClient();
  const syncedOperation = useRef("");
  const run = useBackgroundAiRun(knowledgeGenerationRuns, key);
  useEffect(() => {
    if (run.status !== "succeeded" || syncedOperation.current === run.operationId) return;
    syncedOperation.current = run.operationId;
    client.setQueryData<KnowledgeCardRecord[]>(knowledgeCardKey, (current = []) => [
      run.result, ...current.filter((item) => item.key !== run.result.key),
    ]);
  }, [client, run]);
  return run;
}

export function useKnowledgeGenerationRunsVersion() {
  return useBackgroundAiRunsVersion(knowledgeGenerationRuns);
}

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
