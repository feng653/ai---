import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./AppShell";

vi.mock("../features/agent/AgentWorkspace", () => ({ AgentWorkspace: () => null }));

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}><MemoryRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<div>页面内容</div>} />
        </Route>
      </Routes>
    </MemoryRouter></QueryClientProvider>,
  );
}

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("collapses, expands, and remembers the sidebar state", () => {
    const firstRender = renderShell();
    const collapseButton = screen.getByRole("button", { name: "收起侧边栏" });
    expect(collapseButton.parentElement).toHaveClass("sidebar-footer");
    fireEvent.click(collapseButton);

    expect(document.querySelector(".app-shell")).toHaveClass("sidebar-collapsed");
    expect(window.localStorage.getItem("zhishi:sidebar-collapsed")).toBe("true");
    expect(screen.getByRole("link", { name: "错题库" })).toHaveAttribute("title", "错题库");
    expect(screen.queryByRole("button", { name: "收起侧边栏" })).not.toBeInTheDocument();

    firstRender.unmount();
    renderShell();
    const brandButton = screen.getByRole("button", { name: "展开侧边栏" });
    expect(brandButton).toHaveClass("brand");
    expect(screen.queryByRole("button", { name: "收起侧边栏" })).not.toBeInTheDocument();

    fireEvent.click(brandButton);
    expect(document.querySelector(".app-shell")).not.toHaveClass("sidebar-collapsed");
    expect(window.localStorage.getItem("zhishi:sidebar-collapsed")).toBe("false");
    expect(screen.getByRole("button", { name: "收起侧边栏" })).toBeInTheDocument();
  });
});
