import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLoginCodex } from "./useAi";

const mocks = vi.hoisted(() => ({ loginCodex: vi.fn() }));

vi.mock("../services/aiService", () => ({
  aiService: { loginCodex: mocks.loginCodex },
}));

describe("useLoginCodex", () => {
  afterEach(() => vi.clearAllMocks());

  it("keeps login pending after the Codex panel remounts", async () => {
    let finishLogin: (() => void) | undefined;
    mocks.loginCodex.mockImplementation(() => new Promise<void>((resolve) => {
      finishLogin = resolve;
    }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = renderHook(() => useLoginCodex(), { wrapper });

    act(() => first.result.current.mutate(undefined));
    await waitFor(() => expect(first.result.current.isPending).toBe(true));
    first.unmount();

    const remounted = renderHook(() => useLoginCodex(), { wrapper });
    expect(remounted.result.current.isPending).toBe(true);

    act(() => finishLogin?.());
    await waitFor(() => expect(remounted.result.current.isPending).toBe(false));
  });
});
