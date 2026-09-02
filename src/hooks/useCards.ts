import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CardFilter } from "../domain/card";
import { cardService, type SaveCardRequest } from "../services/cardService";

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
    queryFn: () => cardService.get(id!),
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

export function useDeleteCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cardService.delete(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: cardKeys.all }),
  });
}
