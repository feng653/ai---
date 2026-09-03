import type { Card, CardAsset, CardFilter, CardInput, SourceRevision } from "../domain/card";

export type SaveCardRequest = {
  id?: string;
  input: CardInput;
  expectedRevision?: number;
  forceDraft?: boolean;
};

export type PracticeCardDraft = {
  input: CardInput;
  sourceRevisions: SourceRevision[];
};

export interface CardService {
  list(filter?: CardFilter): Promise<Card[]>;
  get(id: string): Promise<Card | null>;
  save(request: SaveCardRequest): Promise<Card>;
  savePracticeCards(drafts: PracticeCardDraft[]): Promise<Card[]>;
  delete(id: string): Promise<void>;
  importAsset(file: File): Promise<CardAsset>;
  deleteAsset(id: string): Promise<void>;
  getAssetPreview(asset: CardAsset): Promise<string | null>;
}
