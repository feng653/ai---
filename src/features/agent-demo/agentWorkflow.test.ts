import { describe, expect, it } from "vitest";
import type { AiProposal } from "../../domain/ai";
import type { Card, CardAsset } from "../../domain/card";
import { agentTarget, buildAgentProposal, cardReferenceLabel, prepareAgentInput } from "./agentWorkflow";

const card: Card = {
  id: "card-1", subject: "数学", question: "求函数 $f(x)$ 的导数", userAnswer: "",
  correctAnswer: "", supplementalNote: "", solution: "旧解法", errorLocation: "", errorReason: "",
  errorType: "", knowledgePoints: [], assets: [], status: "draft", revision: 3,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z",
};
const asset: CardAsset = {
  id: "asset-1", relativePath: "imports/asset.png", previewUrl: "blob:test",
  mimeType: "image/png", byteSize: 10, width: 1, height: 1,
};
const ai: AiProposal = {
  runId: "run-1", baseRevision: 3, promptVersion: "v4", warnings: ["请复核"],
  fields: {
    solution: { value: "新解法 $f'(x)$", uncertain: false, source: "inference" },
    errorType: { value: "无法判断", uncertain: true, uncertainReason: "信息不足", source: "inference" },
  },
};

describe("agent workflow", () => {
  it("builds a revision-checked update and skips uncertain fields", () => {
    const base = prepareAgentInput(card, [asset]);
    const proposal = buildAgentProposal(ai, base, agentTarget(card), [asset]);

    expect(proposal.kind).toBe("update");
    expect(proposal.targetId).toBe("card-1");
    expect(proposal.expectedRevision).toBe(3);
    expect(proposal.input.solution).toContain("$f'(x)$");
    expect(proposal.input.errorType).toBe("");
    expect(proposal.input.assets[0].previewUrl).toBeUndefined();
    expect(proposal.changes.map((change) => change.label)).toEqual(["目标卡片", "新增图片", "解题过程"]);
    expect(proposal.warnings).toContain("错误类型未采用：信息不足");
  });

  it("uses a stable readable card reference", () => {
    expect(cardReferenceLabel(card)).toBe("求函数 $f(x)$ 的导数");
  });
});
