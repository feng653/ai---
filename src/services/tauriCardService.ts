import { invoke } from "@tauri-apps/api/core";
import type { Card, CardAsset, CardFilter } from "../domain/card";
import type { CardService, SaveCardRequest } from "./cardService.types";

export class TauriCardService implements CardService {
  list(filter: CardFilter = {}): Promise<Card[]> {
    return invoke<Card[]>("list_cards", { filter });
  }

  get(id: string): Promise<Card | null> {
    return invoke<Card | null>("get_card", { id });
  }

  save(request: SaveCardRequest): Promise<Card> {
    return invoke<Card>("save_card", request);
  }

  delete(id: string): Promise<void> {
    return invoke("delete_card", { id });
  }

  async importAsset(file: File): Promise<CardAsset> {
    if (!file.type.startsWith("image/")) throw new Error("只支持图片文件");
    if (file.size > 15 * 1024 * 1024) throw new Error("图片不能超过 15MB");
    const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
    const asset = await invoke<CardAsset>("import_asset", {
      fileName: file.name,
      mimeType: file.type,
      bytes,
    });
    return { ...asset, previewUrl: URL.createObjectURL(file) };
  }

  deleteAsset(id: string): Promise<void> {
    return invoke("delete_asset", { id });
  }

  async getAssetPreview(asset: CardAsset): Promise<string | null> {
    if (asset.previewUrl) return asset.previewUrl;
    const bytes = await invoke<number[]>("read_asset", { id: asset.id });
    return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: asset.mimeType }));
  }
}
