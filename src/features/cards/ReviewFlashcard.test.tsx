import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { emptyCardInput, type Card } from "../../domain/card";
import { ReviewFlashcard } from "./ReviewFlashcard";

afterEach(cleanup);

it("opens the full long answer and returns focus to the same flipped card", async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  const user = userEvent.setup();
  const card: Card = { ...emptyCardInput(), id: "long", revision: 1, status: "organized",
    question: "检查哪些条件？", correctAnswer: "完整答案。".repeat(200), solution: "最后一条依据",
    createdAt: "2026-09-05", updatedAt: "2026-09-05" };
  render(<ReviewFlashcard card={card} />);
  expect(screen.queryByRole("button", { name: "查看详情" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "翻面查看答案" }));
  const expand = screen.getByRole("button", { name: "查看详情" });
  await user.click(expand);
  const dialog = screen.getByRole("dialog", { name: "复习卡详情" });
  expect(within(dialog).getByText(card.correctAnswer)).toBeInTheDocument();
  expect(within(dialog).getByText("最后一条依据")).toBeInTheDocument();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(expand).toHaveFocus();
  expect(screen.getByRole("button", { name: "翻回题目" })).toBeInTheDocument();
  await user.click(expand);
  await user.click(screen.getByRole("button", { name: "关闭详情" }));
  expect(expand).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});

it("keeps the answer out of the front and flips with pointer and keyboard", async () => {
  const user = userEvent.setup();
  const card: Card = { ...emptyCardInput(), id: "p", kind: "practice", revision: 1, status: "organized",
    question: "为什么需要排除零分母？", correctAnswer: "除数不能为零", solution: "先检查分母条件",
    createdAt: "2026-09-05", updatedAt: "2026-09-05" };
  render(<ReviewFlashcard card={card} />);
  expect(screen.getByText("除数不能为零").closest("section")).toHaveAttribute("aria-hidden", "true");
  await user.click(screen.getByRole("button", { name: "翻面查看答案" }));
  expect(screen.getByText("除数不能为零").closest("section")).toHaveAttribute("aria-hidden", "false");
  await user.keyboard(" ");
  expect(screen.getByRole("button", { name: "翻面查看答案" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "翻回题目" })).toHaveFocus();
  expect(card.correctAnswer).toBe("除数不能为零");
});
