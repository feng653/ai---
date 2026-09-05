import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "../../components/AppShell";
import { CardsPage } from "./CardsPage";

vi.mock("../agent/AgentWorkspace", () => ({ AgentWorkspace: () => null }));
afterEach(() => { cleanup(); localStorage.clear(); });
function Detail() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/")}>返回列表</button>;
}

it("retains search, tree expansion and selection after opening a card and returning", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><Routes>
    <Route element={<AppShell />}><Route index element={<CardsPage />} />
      <Route path="/cards/:id" element={<Detail />} /></Route>
  </Routes></MemoryRouter></QueryClientProvider>);
  const search = await screen.findByRole("textbox", { name: "搜索错题卡片" });
  fireEvent.change(search, { target: { value: "符号规律" } });
  fireEvent.click(await screen.findByRole("button", { name: /展开不等式/ }));
  fireEvent.click(screen.getByRole("button", { name: /一元二次不等式/ }));
  await waitFor(() => expect(document.querySelector(".question-card")).not.toBeNull());
  fireEvent.click(document.querySelector(".question-card")!);
  fireEvent.click(screen.getByRole("button", { name: "返回列表" }));
  expect(screen.getByRole("textbox", { name: "搜索错题卡片" })).toHaveValue("符号规律");
  expect(screen.getByRole("button", { name: /收起不等式/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /一元二次不等式/ }).parentElement).toHaveClass("selected");
});
