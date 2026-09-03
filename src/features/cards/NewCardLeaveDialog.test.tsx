import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewCardLeaveDialog } from "./NewCardLeaveDialog";

describe("NewCardLeaveDialog", () => {
  afterEach(cleanup);

  it("explains that a running AI task follows the saved draft", () => {
    render(<NewCardLeaveDialog open aiRunning saving={false} canSave
      onCancel={vi.fn()} onDiscard={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("AI 正在整理");
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeEnabled();
  });

  it("allows clearing an empty new page but does not save an empty draft", () => {
    const discard = vi.fn();
    render(<NewCardLeaveDialog open aiRunning={false} saving={false} canSave={false}
      onCancel={vi.fn()} onDiscard={discard} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "不保存" }));
    expect(discard).toHaveBeenCalledOnce();
  });
});
