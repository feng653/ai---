import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathContent } from "./MathContent";

describe("MathContent", () => {
  it("renders inline and display LaTeX with KaTeX", () => {
    const { container } = render(
      <MathContent>{"行内 $x^2>4$。\n\n$$\nx<-2\\quad\\text{或}\\quad x>2\n$$"}</MathContent>,
    );
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.textContent).toContain("x2>4");
  });

  it("does not interpret raw HTML from AI or user content", () => {
    const { container } = render(<MathContent>{"$x$\n\n<script>bad()</script>"}</MathContent>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".katex")).not.toBeNull();
  });
});
