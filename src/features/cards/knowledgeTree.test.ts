import { describe, expect, it } from "vitest";
import { UNCATEGORIZED_CHAPTER_FILTER, type Card } from "../../domain/card";
import { seedCards } from "../../services/seedCards";
import { buildKnowledgeTree, searchKnowledgeTree, selectionPath } from "./knowledgeTree";

describe("knowledge tree", () => {
  it("aggregates distinct card counts at all three levels", () => {
    const tree = buildKnowledgeTree(seedCards);
    const math = tree.find((node) => node.label === "数学")!;
    const functions = math.children.find((node) => node.label === "函数")!;
    expect(math.count).toBe(3);
    expect(functions.count).toBe(1);
    expect(functions.children[0]).toMatchObject({ label: "函数图像", count: 1, level: 3 });
  });

  it("keeps ancestor paths when searching a leaf", () => {
    const result = searchKnowledgeTree(buildKnowledgeTree(seedCards), "单调性");
    expect(result).toHaveLength(1);
    expect(result[0].children[0].label).toBe("函数与导数");
    expect(result[0].children[0].children[0].label).toBe("函数单调性");
  });

  it("groups points without a chapter and formats their path", () => {
    const card: Card = {
      ...seedCards[0], id: "no-chapter",
      knowledgePoints: [{ subject: "数学", chapter: null, name: "综合题" }],
    };
    const chapter = buildKnowledgeTree([card])[0].children[0];
    expect(chapter.label).toBe("未分章节");
    expect(chapter.selection.chapter).toBe(UNCATEGORIZED_CHAPTER_FILTER);
    expect(selectionPath(chapter.children[0].selection)).toBe("数学 / 未分章节 / 综合题");
  });
});
