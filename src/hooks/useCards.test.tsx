import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cardKeys, useCard, useDeleteCard } from "./useCards";
import { cardService } from "../services/cardService";
import type { Card } from "../domain/card";

const card = { id: "deleted", question: "已删除的题目" } as Card;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(cardKeys.detail(card.id), card);
  client.setQueryData(cardKeys.list({}), [card]);
  client.setQueryData(cardKeys.list({ kind: "practice" }), [card]);
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

it("replaces stale detail data with null when a deleted card is refetched", async () => {
  vi.spyOn(cardService, "get").mockRejectedValue({ code: "NOT_FOUND", message: "卡片不存在" });
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useCard(card.id), { wrapper });
  expect(result.current.data).toEqual(card);
  await act(() => client.invalidateQueries({ queryKey: cardKeys.all }));
  await waitFor(() => expect(result.current.data).toBeNull());
  expect(result.current.isError).toBe(false);
});

it.each([false, true])("clears all cached lists and detail after deletion (already missing: %s)", async (missing) => {
  const remove = vi.spyOn(cardService, "delete");
  if (missing) remove.mockRejectedValue({ code: "NOT_FOUND", message: "卡片不存在" });
  else remove.mockResolvedValue(undefined);
  const { client, wrapper } = setup();
  const { result } = renderHook(useDeleteCard, { wrapper });
  await act(() => result.current.mutateAsync(card.id));
  expect(client.getQueryData(cardKeys.detail(card.id))).toBeNull();
  expect(client.getQueryData(cardKeys.list({}))).toEqual([]);
  expect(client.getQueryData(cardKeys.list({ kind: "practice" }))).toEqual([]);
});

it("does not treat storage failures as a successful deletion", async () => {
  vi.spyOn(cardService, "delete").mockRejectedValue({ code: "STORAGE_ERROR", message: "数据库不可用" });
  const { client, wrapper } = setup();
  const { result } = renderHook(useDeleteCard, { wrapper });
  await act(async () => { await expect(result.current.mutateAsync(card.id)).rejects.toMatchObject({ code: "STORAGE_ERROR" }); });
  expect(client.getQueryData(cardKeys.detail(card.id))).toEqual(card);
});
