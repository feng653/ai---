import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiConnectionsPage } from "./AiConnectionsPage";

const actions = vi.hoisted(() => ({
  login: vi.fn(), save: vi.fn(), test: vi.fn(), select: vi.fn(), disconnect: vi.fn(),
}));

vi.mock("../../hooks/useAi", () => ({
  useAiProviders: () => ({ data: [
    { id: "codex", name: "Codex", state: "disconnected", message: "请通过浏览器登录", active: true, configured: false },
    { id: "deepseek", name: "DeepSeek API", state: "disconnected", message: "尚未配置", active: false, configured: false },
    { id: "custom:a46fcc5d-da6c-49fc-87dc-96e41a4c50c4", name: "校内模型", state: "connected", message: "配置已保存", active: false, configured: true, baseUrl: "https://school.example/v1", model: "school-math" },
    { id: "custom:7835450e-3602-4418-bf16-3d329aa79c1a", name: "本地模型", state: "connected", message: "配置已保存", active: false, configured: true, baseUrl: "http://localhost:11434/v1", model: "local-math" },
  ] }),
  useLoginCodex: () => ({ mutateAsync: actions.login, isPending: false }),
  useSaveApiProvider: () => ({ mutateAsync: actions.save, isPending: false }),
  useTestApiProvider: () => ({ mutateAsync: actions.test, isPending: false }),
  useSelectAiProvider: () => ({ mutate: actions.select, isPending: false }),
  useDisconnectAiProvider: () => ({ mutateAsync: actions.disconnect, isPending: false }),
}));

describe("AiConnectionsPage", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

  it("starts the isolated Codex browser login", async () => {
    actions.login.mockResolvedValue({ state: "connected" });
    render(<AiConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /^通过浏览器登录$/ }));
    await waitFor(() => expect(actions.login).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("Codex 登录成功");
  });

  it("saves a real DeepSeek provider input", async () => {
    actions.save.mockResolvedValue({ state: "connected" });
    render(<AiConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: /DeepSeek API/ }));
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "secret-key" } });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(actions.save).toHaveBeenCalledWith(expect.objectContaining({
      id: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-v4-flash", apiKey: "secret-key",
    })));
    expect(screen.getByLabelText("API Key")).toHaveValue("");
  });

  it("lists saved custom APIs as separate providers", () => {
    render(<AiConnectionsPage />);
    expect(screen.getByRole("button", { name: /校内模型/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /本地模型/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /本地模型/ }));
    expect(screen.getByLabelText("Base URL")).toHaveValue("http://localhost:11434/v1");
    expect(screen.getByLabelText("模型名称")).toHaveValue("local-math");
  });

  it("adds and tests a custom API with an independent id", async () => {
    actions.test.mockResolvedValue(undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("318cba6f-9eff-4e95-9332-70bedf376977");
    render(<AiConnectionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "新增自定义 API" }));
    fireEvent.change(screen.getByLabelText("服务名称"), { target: { value: "校内模型" } });
    fireEvent.change(screen.getByLabelText("Base URL"), { target: { value: "https://llm.example/v1" } });
    fireEvent.change(screen.getByLabelText("模型名称"), { target: { value: "math-model" } });
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
    await waitFor(() => expect(actions.test).toHaveBeenCalledWith(expect.objectContaining({
      id: "custom:318cba6f-9eff-4e95-9332-70bedf376977",
      name: "校内模型", baseUrl: "https://llm.example/v1", model: "math-model",
    })));
    expect(screen.getByRole("status")).toHaveTextContent("连接测试成功");
  });
});
