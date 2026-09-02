import { describe, expect, it } from "vitest";
import {
  calculateCardStatus,
  canSaveCard,
  emptyCardInput,
  validateCardInput,
  type CardInput,
} from "./card";

const input = (patch: Partial<CardInput> = {}): CardInput => ({
  ...emptyCardInput(),
  ...patch,
});

const point = { subject: "数学", chapter: "不等式", name: "一元二次不等式" };

describe("calculateCardStatus", () => {
  it("keeps an image-only card as draft", () => {
    const card = input({
      assets: [{ id: "a", relativePath: "a.png", mimeType: "image/png", byteSize: 10 }],
    });
    expect(calculateCardStatus(card)).toBe("draft");
    expect(canSaveCard(card)).toBe(true);
  });

  it("requires a knowledge point", () => {
    expect(calculateCardStatus(input({ question: "题目", solution: "解法" }))).toBe("draft");
  });

  it("requires a diagnosis when user work exists", () => {
    const card = input({
      question: "题目",
      userAnswer: "错误步骤",
      solution: "正确解法",
      knowledgePoints: [point],
    });
    expect(calculateCardStatus(card)).toBe("draft");
  });

  it("organizes a card with user work and a meaningful diagnosis", () => {
    const card = input({
      question: "题目",
      userAnswer: "错误步骤",
      errorReason: "符号判断错误",
      errorType: "方法错误",
      knowledgePoints: [point],
    });
    expect(calculateCardStatus(card)).toBe("organized");
  });

  it("organizes a no-answer card using solution and knowledge point", () => {
    const card = input({ question: "题目", solution: "正确解法", knowledgePoints: [point] });
    expect(calculateCardStatus(card)).toBe("organized");
  });
});

describe("validation", () => {
  it("rejects an empty card", () => {
    expect(validateCardInput(input())).toContain("至少需要输入题目或添加一张图片");
  });

  it("limits knowledge points to three", () => {
    const card = input({
      question: "题目",
      knowledgePoints: [point, point, point, point],
    });
    expect(validateCardInput(card)).toContain("每张卡片最多关联 3 个主要知识点");
  });
});
