import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AI_REQUIREMENTS_MAX_LENGTH, AiRequirementsField } from "./AiRequirementsField";

describe("AiRequirementsField", () => {
  it("provides a visible optional label, helper text, and a bounded textarea", () => {
    const onChange = vi.fn();
    render(<AiRequirementsField id="requirements" value="强调定义域" onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: /附加要求/ });
    expect(input).toHaveAttribute("maxlength", String(AI_REQUIREMENTS_MAX_LENGTH));
    expect(input).toHaveAccessibleDescription(/不改变卡片范围和可靠性规则/);
    expect(screen.getByText(`5/${AI_REQUIREMENTS_MAX_LENGTH}`)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "步骤更简洁" } });
    expect(onChange).toHaveBeenCalledWith("步骤更简洁");
  });
});
