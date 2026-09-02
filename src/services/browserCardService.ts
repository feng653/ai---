import { calculateCardStatus, type Card, type CardAsset, type CardFilter } from "../domain/card";
import type { CardService, SaveCardRequest } from "./cardService.types";
import { seedCards } from "./seedCards";

const STORAGE_KEY = "zhishi.browser.cards.v1";

function loadCards(): Card[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedCards));
    return structuredClone(seedCards);
  }
  try {
    return JSON.parse(raw) as Card[];
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedCards));
    return structuredClone(seedCards);
  }
}

function storeCards(cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function matchesFilter(card: Card, filter: CardFilter): boolean {
  if (filter.status && filter.status !== "all" && card.status !== filter.status) return false;
  if (filter.knowledgePoint && !card.knowledgePoints.some((point) => point.name === filter.knowledgePoint)) {
    return false;
  }
  const query = filter.query?.trim().toLocaleLowerCase();
  if (!query) return true;
  const searchable = [
    card.question,
    card.userAnswer,
    card.correctAnswer,
    card.solution,
    card.errorLocation,
    card.errorReason,
    card.errorType,
    ...card.knowledgePoints.flatMap((point) => [point.subject, point.chapter ?? "", point.name]),
  ].join(" ").toLocaleLowerCase();
  return searchable.includes(query);
}

export class BrowserCardService implements CardService {
  async list(filter: CardFilter = {}): Promise<Card[]> {
    return loadCards().filter((card) => matchesFilter(card, filter))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<Card | null> {
    return loadCards().find((card) => card.id === id) ?? null;
  }

  async save({ id, input, expectedRevision }: SaveCardRequest): Promise<Card> {
    const cards = loadCards();
    const index = id ? cards.findIndex((card) => card.id === id) : -1;
    const existing = index >= 0 ? cards[index] : undefined;
    if (existing && expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new Error("REVISION_CONFLICT: 卡片已被修改，请重新载入后再保存");
    }
    const now = new Date().toISOString();
    const card: Card = {
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      status: calculateCardStatus(input),
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (index >= 0) cards[index] = card;
    else cards.unshift(card);
    storeCards(cards);
    return card;
  }

  async delete(id: string): Promise<void> {
    storeCards(loadCards().filter((card) => card.id !== id));
  }

  async importAsset(file: File): Promise<CardAsset> {
    if (!file.type.startsWith("image/")) throw new Error("只支持图片文件");
    if (file.size > 15 * 1024 * 1024) throw new Error("图片不能超过 15MB");
    const previewUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
    return {
      id: crypto.randomUUID(), relativePath: file.name, previewUrl,
      mimeType: file.type, byteSize: file.size,
    };
  }

  async deleteAsset(): Promise<void> {}

  async getAssetPreview(asset: CardAsset): Promise<string | null> {
    return asset.previewUrl ?? null;
  }
}
