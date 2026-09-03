import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCardInput } from "../../domain/card";
import { cardService } from "../../services/cardService";
import { useNewCardLeave } from "./useNewCardLeave";

vi.mock("../../services/cardService", () => ({
  cardService: { deleteAsset: vi.fn() },
}));

describe("useNewCardLeave", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves a library card explicitly as draft and clears the new-page snapshot", async () => {
    const input = { ...emptyCardInput(), question: "待整理题目" };
    const saveCard = vi.fn().mockResolvedValue({ ...input, id: "saved-1" });
    const onLeave = vi.fn();
    localStorage.setItem("draft:new", "snapshot");
    const { result } = renderHook(() => useNewCardLeave({
      input, draftKey: "draft:new", aiRunKey: "card-editor:new",
      saveCard, onError: vi.fn(), onLeave,
    }));

    act(() => result.current.request());
    expect(result.current.open).toBe(true);
    await act(() => result.current.save());

    expect(saveCard).toHaveBeenCalledWith({ input, forceDraft: true });
    expect(localStorage.getItem("draft:new")).toBeNull();
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("deletes imported assets and clears the new page when not saving", async () => {
    const input = { ...emptyCardInput(), assets: [{
      id: "asset-1", relativePath: "asset.png", mimeType: "image/png", byteSize: 3,
    }] };
    const onLeave = vi.fn();
    localStorage.setItem("draft:new", "snapshot");
    const { result } = renderHook(() => useNewCardLeave({
      input, draftKey: "draft:new", aiRunKey: "card-editor:new",
      saveCard: vi.fn(), onError: vi.fn(), onLeave,
    }));

    await act(() => result.current.discard());

    expect(cardService.deleteAsset).toHaveBeenCalledWith("asset-1");
    expect(localStorage.getItem("draft:new")).toBeNull();
    expect(onLeave).toHaveBeenCalledOnce();
  });
});
