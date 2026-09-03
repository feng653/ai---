import { beforeEach, describe, expect, it } from "vitest";
import { emptyCardInput, UNCATEGORIZED_CHAPTER_FILTER } from "../domain/card";
import { BrowserCardService } from "./cardService";

const service = new BrowserCardService();

beforeEach(() => localStorage.clear());

describe("BrowserCardService", () => {
  it("searches across diagnosis and knowledge points", async () => {
    expect(await service.list({ query: "正数分支" })).toHaveLength(1);
    expect(await service.list({ knowledgePoint: "一元二次不等式" })).toHaveLength(1);
  });

  it("filters at subject, chapter, and leaf levels", async () => {
    expect(await service.list({ knowledgeSubject: "数学" })).toHaveLength(3);
    expect(await service.list({ knowledgeSubject: "数学", knowledgeChapter: "函数" })).toHaveLength(1);
    expect(await service.list({
      knowledgeSubject: "数学", knowledgeChapter: "函数", knowledgePoint: "函数图像",
    })).toHaveLength(1);
    expect(await service.list({ knowledgeSubject: "物理", knowledgePoint: "函数图像" })).toHaveLength(0);
  });

  it("filters points that have no chapter", async () => {
    await service.save({
      input: {
        ...emptyCardInput(), question: "综合题",
        knowledgePoints: [{ subject: "数学", chapter: null, name: "综合应用" }],
      },
    });
    const matches = await service.list({
      knowledgeSubject: "数学", knowledgeChapter: UNCATEGORIZED_CHAPTER_FILTER,
    });
    expect(matches.map((card) => card.question)).toEqual(["综合题"]);
  });

  it("saves and reloads a card", async () => {
    const saved = await service.save({
      input: { ...emptyCardInput(), question: "新题目" },
    });
    expect(saved.status).toBe("draft");
    await expect(service.get(saved.id)).resolves.toMatchObject({ question: "新题目", revision: 1 });
  });

  it("forces a complete new card to remain a draft when leaving the editor", async () => {
    const saved = await service.save({
      forceDraft: true,
      input: {
        ...emptyCardInput(), question: "完整题目", solution: "完整解法",
        knowledgePoints: [{ subject: "数学", chapter: "函数", name: "单调性" }],
      },
    });
    expect(saved.status).toBe("draft");
  });

  it("saves practice cards with source revisions and filters them separately", async () => {
    const source = (await service.list({ kind: "mistake" }))[0];
    const [saved] = await service.savePracticeCards([{
      input: { ...emptyCardInput(), question: "变式题", solution: "答案",
        knowledgePoints: source.knowledgePoints.slice(0, 1) },
      sourceRevisions: [{ cardId: source.id, revision: source.revision }],
    }]);
    expect(saved).toMatchObject({ kind: "practice", sourceRevisions: [{ cardId: source.id }] });
    expect(await service.list({ kind: "practice" })).toHaveLength(1);
    expect(await service.list({ kind: "mistake" })).toHaveLength(3);
  });

  it("refuses practice cards generated from a stale browser source", async () => {
    const source = (await service.list({ kind: "mistake" }))[0];
    await expect(service.savePracticeCards([{
      input: { ...emptyCardInput(), question: "过期变式题" },
      sourceRevisions: [{ cardId: source.id, revision: source.revision + 1 }],
    }])).rejects.toThrow("REVISION_CONFLICT");
  });

  it("detects revision conflicts", async () => {
    const existing = (await service.list())[0];
    await expect(
      service.save({ id: existing.id, expectedRevision: 0, input: existing }),
    ).rejects.toThrow("REVISION_CONFLICT");
  });

  it("deletes a card", async () => {
    const existing = (await service.list())[0];
    await service.delete(existing.id);
    await expect(service.get(existing.id)).resolves.toBeNull();
  });
});
