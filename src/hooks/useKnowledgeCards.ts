import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KnowledgeCardRecord, KnowledgeCardSaveInput } from "../domain/ai";
import { aiService } from "../services/aiService";

export const knowledgeCardKey = ["knowledge-cards"] as const;

export function useKnowledgeCards() {
  return useQuery({ queryKey: knowledgeCardKey, queryFn: () => aiService.listKnowledgeCards() });
}

export function useSaveKnowledgeCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: KnowledgeCardSaveInput) => aiService.saveKnowledgeCard(input),
    onSuccess: (record) => client.setQueryData<KnowledgeCardRecord[]>(knowledgeCardKey, (current = []) => [
      record, ...current.filter((item) => item.key !== record.key),
    ]),
  });
}

export function useDeleteKnowledgeCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => aiService.deleteKnowledgeCard(key),
    onSuccess: (_, key) => client.setQueryData<KnowledgeCardRecord[]>(knowledgeCardKey,
      (current = []) => current.filter((item) => item.key !== key)),
  });
}
