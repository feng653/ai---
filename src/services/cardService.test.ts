import { beforeEach, describe, expect, it } from "vitest";
import { emptyCardInput } from "../domain/card";
import { BrowserCardService } from "./cardService";

const service = new BrowserCardService();

beforeEach(() => localStorage.clear());

describe("BrowserCardService", () => {
  it("searches across diagnosis and knowledge points", async () => {
    expect(await service.list({ query: "正数分支" })).toHaveLength(1);
    expect(await service.list({ knowledgePoint: "一元二次不等式" })).toHaveLength(1);
  });

  it("saves and reloads a card", async () => {
    const saved = await service.save({
      input: { ...emptyCardInput(), question: "新题目" },
    });
    expect(saved.status).toBe("draft");
    await expect(service.get(saved.id)).resolves.toMatchObject({ question: "新题目", revision: 1 });
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
