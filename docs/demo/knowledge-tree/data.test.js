import { describe, expect, it } from "vitest";
import "./data.js";
import "./learning.js";

const { buildKnowledgeTree, demoCards, filterCards, filterTree } = globalThis.KnowledgeTreeData;
const { buildKnowledgeCards, buildLearningContext } = globalThis.KnowledgeTreeLearning;

describe("knowledge tree demo", () => {
  const tree = buildKnowledgeTree(demoCards);

  it("aggregates distinct card counts at all three levels", () => {
    const math = tree.find((node) => node.label === "数学");
    const functions = math.children.find((node) => node.label === "函数");
    const graph = functions.children.find((node) => node.label === "函数图像");
    const inequalities = math.children.find((node) => node.label === "不等式");
    expect(math.count).toBe(6);
    expect(functions.count).toBe(3);
    expect(graph.count).toBe(1);
    expect(inequalities.children[0].count).toBe(3);
  });

  it("filters cards by subject, chapter, or leaf", () => {
    expect(filterCards(demoCards, { subject: "物理" })).toHaveLength(3);
    expect(filterCards(demoCards, { subject: "物理", chapter: "力学" })).toHaveLength(2);
    expect(filterCards(demoCards, {
      subject: "物理", chapter: "力学", name: "摩擦力",
    }).map((card) => card.id)).toEqual(["friction"]);
  });

  it("keeps matching descendants and their ancestor paths in search", () => {
    const result = filterTree(tree, "单调性");
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("数学");
    expect(result[0].children[0].label).toBe("函数");
    expect(result[0].children[0].children[0].label).toBe("函数单调性");
  });

  it("builds tutorial and review content only for a selected leaf", () => {
    const chapter = { subject: "数学", chapter: "函数" };
    const leaf = { ...chapter, name: "函数单调性" };
    expect(buildLearningContext(demoCards, chapter)).toBeNull();
    const context = buildLearningContext(demoCards, leaf);
    expect(context.topic).toBe("函数单调性");
    expect(context.sourceIds).toEqual(["monotonicity"]);
    expect(context.tutorial.sections).toHaveLength(3);
    expect(context.questions.map((question) => question.kind)).toEqual([
      "变式练习", "原题再练", "错因辨析", "方法复述", "自检清单",
    ]);
  });

  it("keeps generated answers and source references complete", () => {
    const leaves = tree.flatMap((subject) => subject.children.flatMap((chapter) =>
      chapter.children.map((point) => ({
        subject: subject.label, chapter: chapter.label, name: point.label,
      }))));
    for (const leaf of leaves) {
      const context = buildLearningContext(demoCards, leaf);
      expect(context.sourceIds.length).toBeGreaterThan(0);
      expect(context.questions.every((question) => question.prompt && question.answer && question.explanation)).toBe(true);
    }
  });

  it("builds searchable knowledge cards at every tree scope", () => {
    expect(buildKnowledgeCards(demoCards, null)).toHaveLength(8);
    const mathCards = buildKnowledgeCards(demoCards, { subject: "数学" });
    expect(mathCards).toHaveLength(5);
    const inequality = mathCards.find((card) => card.name === "一元二次不等式");
    expect(inequality.sourceCount).toBe(3);
    expect(inequality.mistakeCount).toBe(3);
    expect(inequality.coverage).toBe("证据较充分");
  });
});
