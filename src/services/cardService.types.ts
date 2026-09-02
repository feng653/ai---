import type { Card, CardAsset, CardFilter, CardInput } from "../domain/card";

export type SaveCardRequest = {
  id?: string;
  input: CardInput;
  expectedRevision?: number;
};

export interface CardService {
  list(filter?: CardFilter): Promise<Card[]>;
  get(id: string): Promise<Card | null>;
  save(request: SaveCardRequest): Promise<Card>;
  delete(id: string): Promise<void>;
  importAsset(file: File): Promise<CardAsset>;
  deleteAsset(id: string): Promise<void>;
  getAssetPreview(asset: CardAsset): Promise<string | null>;
}
