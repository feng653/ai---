import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyCardInput } from "../domain/card";
import { TauriCardService } from "./tauriCardService";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockedInvoke = vi.mocked(invoke);
const service = new TauriCardService();

beforeEach(() => mockedInvoke.mockReset());

describe("TauriCardService IPC contract", () => {
  it("sends save arguments at the command top level", async () => {
    const request = { id: "card-1", input: emptyCardInput(), expectedRevision: 2 };
    mockedInvoke.mockResolvedValue({ id: "card-1" });

    await service.save(request);

    expect(mockedInvoke).toHaveBeenCalledWith("save_card", request);
    expect(mockedInvoke).not.toHaveBeenCalledWith("save_card", { request });
  });

  it("uses the asset read command for persisted previews", async () => {
    mockedInvoke.mockResolvedValue([137, 80, 78, 71]);
    const url = await service.getAssetPreview({
      id: "asset-1", relativePath: "imports/asset-1.png",
      mimeType: "image/png", byteSize: 4,
    });
    expect(mockedInvoke).toHaveBeenCalledWith("read_asset", { id: "asset-1" });
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url!);
  });

  it("sends a practice batch with source revisions", async () => {
    const drafts = [{ input: { ...emptyCardInput(), question: "变式题" },
      sourceRevisions: [{ cardId: "source-1", revision: 3 }] }];
    mockedInvoke.mockResolvedValue([]);
    await service.savePracticeCards(drafts);
    expect(mockedInvoke).toHaveBeenCalledWith("save_practice_cards", { drafts });
  });
});
