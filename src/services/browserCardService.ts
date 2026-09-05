import {
  calculateCardStatus, UNCATEGORIZED_CHAPTER_FILTER,
  type Card, type CardAsset, type CardFilter,
} from "../domain/card";
import type { CardService, PracticeCardDraft, SaveCardRequest } from "./cardService.types";
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
  if (filter.unclassified && card.knowledgePoints.some((point) => point.name.trim())) return false;
  if (filter.kind && filter.kind !== "all" && (card.kind ?? "mistake") !== filter.kind) return false;
  if (filter.status && filter.status !== "all" && card.status !== filter.status) return false;
  const hasKnowledgeFilter = filter.knowledgeSubject || filter.knowledgeChapter || filter.knowledgePoint;
  if (hasKnowledgeFilter && !card.knowledgePoints.some((point) =>
    (!filter.knowledgeSubject || point.subject === filter.knowledgeSubject)
    && (!filter.knowledgeChapter || (filter.knowledgeChapter === UNCATEGORIZED_CHAPTER_FILTER
      ? !point.chapter?.trim() : point.chapter === filter.knowledgeChapter))
    && (!filter.knowledgePoint || point.id === filter.knowledgePoint || point.name === filter.knowledgePoint))) {
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

  async save({ id, input, expectedRevision, forceDraft }: SaveCardRequest): Promise<Card> {
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
      kind: existing?.kind ?? "mistake",
      sourceRevisions: existing?.sourceRevisions ?? [],
      status: forceDraft ? "draft" : calculateCardStatus(input),
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (index >= 0) cards[index] = card;
    else cards.unshift(card);
    storeCards(cards);
    return card;
  }

  async savePracticeCards(drafts: PracticeCardDraft[]): Promise<Card[]> {
    const cards = loadCards();
    if (!drafts.length) throw new Error("至少需要生成一张习题卡");
    for (const draft of drafts) {
      if (!draft.sourceRevisions.length) throw new Error("习题卡必须保留来源错题版本");
      for (const source of draft.sourceRevisions) {
        const current = cards.find((card) => card.id === source.cardId && (card.kind ?? "mistake") === "mistake");
        if (!current || current.revision !== source.revision) {
          throw new Error("REVISION_CONFLICT: 来源错题已变化，请重新选择后生成");
        }
      }
    }
    const now = new Date().toISOString();
    const saved = drafts.map(({ input, sourceRevisions }) => ({
      ...input,
      id: crypto.randomUUID(),
      kind: "practice" as const,
      sourceRevisions,
      status: calculateCardStatus(input),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    }));
    storeCards([...saved, ...cards]);
    return saved;
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
