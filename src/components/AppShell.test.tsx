import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";

vi.mock("../features/agent-demo/AgentWindow", () => ({ AgentWindow: () => null }));

function renderShell() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<div>页面内容</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("collapses, expands, and remembers the sidebar state", () => {
    const firstRender = renderShell();
    fireEvent.click(screen.getByRole("button", { name: "收起侧边栏" }));

    expect(document.querySelector(".app-shell")).toHaveClass("sidebar-collapsed");
    expect(window.localStorage.getItem("zhishi:sidebar-collapsed")).toBe("true");
    expect(screen.getByRole("link", { name: "我的错题" })).toHaveAttribute("title", "我的错题");

    firstRender.unmount();
    renderShell();
    expect(screen.getByRole("button", { name: "展开侧边栏" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开侧边栏" }));
    expect(document.querySelector(".app-shell")).not.toHaveClass("sidebar-collapsed");
    expect(window.localStorage.getItem("zhishi:sidebar-collapsed")).toBe("false");
  });
});
