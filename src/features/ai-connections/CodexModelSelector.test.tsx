import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CodexModelSelector } from "./CodexModelSelector";
import { codexModelService } from "../../services/codexModelService";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(current?: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <CodexModelSelector current={current} />
  </QueryClientProvider>);
}
it("restores the selected model, saves an explicit choice and disables changes in flight", async () => {
  vi.spyOn(codexModelService, "list").mockResolvedValue({ selected: "first", models: [
    { model: "first", displayName: "First", isDefault: true }, { model: "second", displayName: "Second", isDefault: false },
  ] });
  let finish: (() => void) | undefined;
  const save = vi.spyOn(codexModelService, "save").mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  mount();
  await waitFor(() => expect(screen.getByRole("combobox", { name: "模型" })).toHaveValue("first"));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "second" } });
  fireEvent.click(screen.getByRole("button", { name: "保存模型" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith("second", expect.anything()));
  expect(screen.getByRole("combobox")).toBeDisabled();
  finish?.();
  expect(await screen.findByText("模型已保存")).toBeInTheDocument();
});
it("keeps an unavailable selection visible and refuses saving stale choices after refresh fails", async () => {
  vi.spyOn(codexModelService, "list").mockRejectedValue(new Error("模型列表加载失败"));
  mount("removed-model");
  expect(await screen.findByRole("alert")).toHaveTextContent("模型列表加载失败");
  expect(screen.getByRole("combobox")).toHaveValue("removed-model");
  expect(screen.getByRole("button", { name: "保存模型" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "刷新模型" })).toBeEnabled();
});
