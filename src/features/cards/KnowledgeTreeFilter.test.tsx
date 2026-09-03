import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { seedCards } from "../../services/seedCards";
import { KnowledgeTreeFilter } from "./KnowledgeTreeFilter";

afterEach(cleanup);

describe("KnowledgeTreeFilter", () => {
  it("selects a parent category instead of requiring a leaf", () => {
    const onChange = vi.fn();
    render(<KnowledgeTreeFilter cards={seedCards} selection={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("数学"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      subject: "数学", chapter: undefined, point: undefined,
    }));
  });

  it("searches a leaf while retaining its hierarchy", () => {
    render(<KnowledgeTreeFilter cards={seedCards} selection={null} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: "搜索知识点分类" }), {
      target: { value: "单调性" },
    });
    expect(screen.getByText("数学")).toBeInTheDocument();
    expect(screen.getByText("函数与导数")).toBeInTheDocument();
    expect(screen.getByText("函数单调性")).toBeInTheDocument();
  });
});
