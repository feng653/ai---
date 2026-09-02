import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentComposer } from "./AgentComposer";

describe("AgentComposer", () => {
  it("accepts a dropped image and sends it with the message", async () => {
    const onSend = vi.fn();
    const { container } = render(<AgentComposer busy={false} onSend={onSend} />);
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
  });
});
