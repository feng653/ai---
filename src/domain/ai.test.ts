import { describe, expect, it } from "vitest";
import { emptyCardInput } from "./card";
import { applyAiProposal, getDefaultAcceptedFields, type AiProposal } from "./ai";

const proposal: AiProposal = {
  runId: "run-1",
  baseRevision: 0,
  promptVersion: "v1",
  warnings: [],
  fields: {
    correctAnswer: { value: "x > 2 或 x < -2", uncertain: false, source: "inference" },
    solution: { value: "使用绝对值求解", uncertain: false, source: "inference" },
    errorReason: { value: "缺少负数分支", uncertain: true, uncertainReason: "作答不完整", source: "inference" },
  },
};

describe("AI proposal review", () => {
  it("only preselects empty and certain fields", () => {
    const input = { ...emptyCardInput(), correctAnswer: "我的手工答案" };
    expect(getDefaultAcceptedFields(input, proposal)).toEqual(["solution"]);
  });

  it("applies only explicitly accepted fields without mutating input", () => {
    const input = { ...emptyCardInput(), correctAnswer: "我的手工答案" };
    const next = applyAiProposal(input, proposal, ["solution"]);
    expect(next.solution).toBe("使用绝对值求解");
    expect(next.correctAnswer).toBe("我的手工答案");
    expect(input.solution).toBe("");
  });
});
