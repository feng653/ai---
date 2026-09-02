import { describe, expect, it } from "vitest";
import { applyDemoProposal, buildDemoProposal, initialDemoCards } from "./demoAgent";

describe("demo agent", () => {
  it("creates a card proposal from an image", () => {
    const proposal = buildDemoProposal("请创建卡片", [
      { id: "image", name: "question.png", previewUrl: "data:image/png;base64,AA==" },
    ]);
    expect(proposal.kind).toBe("create");
    expect(proposal.patch.question).toContain("$x^2>4$");
    expect(applyDemoProposal(initialDemoCards, proposal)).toHaveLength(3);
  });

  it("updates only the requested demo card", () => {
    const proposal = buildDemoProposal("修改导数卡片的错因", []);
    const cards = applyDemoProposal(initialDemoCards, proposal);
    expect(proposal.kind).toBe("update");
    expect(cards[0].errorReason).toContain("$x<-1$");
    expect(cards[1]).toEqual(initialDemoCards[1]);
  });
});
