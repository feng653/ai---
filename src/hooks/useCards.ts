import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isNotFoundError } from "../services/errorMessage";
import type { Card, CardFilter } from "../domain/card";
import { cardService, type PracticeCardDraft, type SaveCardRequest } from "../services/cardService";

export const cardKeys = {
  all: ["cards"] as const,
  list: (filter: CardFilter) => ["cards", "list", filter] as const,
  detail: (id: string) => ["cards", "detail", id] as const,
};

export function useCards(filter: CardFilter = {}) {
  return useQuery({ queryKey: cardKeys.list(filter), queryFn: () => cardService.list(filter) });
}

export function useCard(id?: string) {
  return useQuery({
    queryKey: cardKeys.detail(id ?? ""),
    queryFn: async () => {
      try { return await cardService.get(id!); }
      catch (error) { if (isNotFoundError(error)) return null; throw error; }
    },
    enabled: Boolean(id),
  });
}

export function useSaveCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveCardRequest) => cardService.save(request),
    onSuccess: (card) => {
      client.setQueryData(cardKeys.detail(card.id), card);
      void client.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useSavePracticeCards() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (drafts: PracticeCardDraft[]) => cardService.savePracticeCards(drafts),
    onSuccess: () => void client.invalidateQueries({ queryKey: cardKeys.all }),
  });
}

export function useDeleteCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try { await cardService.delete(id); }
      catch (error) { if (!isNotFoundError(error)) throw error; }
    },
    onSuccess: async (_, id) => {
      await client.cancelQueries({ queryKey: cardKeys.all });
      client.setQueryData(cardKeys.detail(id), null);
      client.setQueriesData<Card[]>({ queryKey: ["cards", "list"] },
        (cards) => cards?.filter((card) => card.id !== id));
      await client.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}
