import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../../domain/card";
import { AgentComposer } from "./AgentComposer";

const cards: Card[] = [{
  id: "derivative", subject: "数学", question: "导数与单调区间", userAnswer: "",
  correctAnswer: "", supplementalNote: "", solution: "", errorLocation: "", errorReason: "",
  errorType: "", knowledgePoints: [], assets: [], status: "draft", revision: 1,
  createdAt: "2026-09-02T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z",
}];

afterEach(cleanup);

describe("AgentComposer", () => {
  it("accepts a dropped image and sends it with the message", async () => {
    const onSend = vi.fn();
    const { container } = render(<AgentComposer busy={false} cards={cards} onSend={onSend} />);
    const image = new File([new Uint8Array([1, 2, 3])], "question.png", { type: "image/png" });

    fireEvent.drop(container.querySelector(".agent-composer")!, {
      dataTransfer: { files: [image] },
    });
    await screen.findByAltText("question.png");
    fireEvent.change(screen.getByPlaceholderText(/描述要创建或修改/), { target: { value: "创建卡片" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => expect(onSend).toHaveBeenCalledOnce());
    expect(onSend.mock.calls[0][1]).toHaveLength(1);
    expect(onSend.mock.calls[0][1][0].name).toBe("question.png");
    expect(onSend.mock.calls[0][1][0].file).toBe(image);
  });

  it("autocompletes a referenced card after typing at", () => {
    const onSend = vi.fn();
    const view = render(<AgentComposer busy={false} cards={cards} onSend={onSend} />);
    const input = view.getByPlaceholderText(/描述要创建或修改/);
    fireEvent.change(input, { target: { value: "修改 @导" } });
    fireEvent.mouseDown(view.getByRole("option", { name: /@导数与单调区间/ }));
    expect(input).toHaveValue("修改 @导数与单调区间 ");
    fireEvent.click(view.getByRole("button", { name: "发送" }));
    expect(onSend).toHaveBeenCalledWith("修改 @导数与单调区间", [], ["derivative"]);
  });
});
