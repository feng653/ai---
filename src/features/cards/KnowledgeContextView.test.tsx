import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KnowledgeContextView } from "./KnowledgeContextView";
afterEach(cleanup);
it("keeps mistake and review entrypoints without a knowledge-card module", () => {
  render(<QueryClientProvider client={new QueryClient()}><KnowledgeContextView
    allCards={[]} cards={[]} savedPracticeCards={[]} selection={null} loading={false}
    onSelectionChange={vi.fn()} onOpenCard={vi.fn()} onCreateCard={vi.fn()} />
  </QueryClientProvider>);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.queryByRole("tab", { name: /知识卡/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: /错因复习/ }));
  expect(screen.getByRole("button", { name: "开始生成" })).toBeInTheDocument();
});
