import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { emptyCardInput, type Card } from "../../domain/card";
import { ReviewFlashcard } from "./ReviewFlashcard";

afterEach(cleanup);

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
