import type { AiProviderId } from "../../domain/ai";

export type ProviderId = AiProviderId;
export type ProviderKind = "codex" | "deepseek" | "custom";

export type ProviderDefinition = {
  id: ProviderId;
  kind: ProviderKind;
  name: string;
  summary: string;
  badge: string;
  accent: "green" | "blue" | "slate";
  initials: string;
  logo?: string;
};

export const fixedProviders: ProviderDefinition[] = [
  {
    id: "codex",
    kind: "codex",
    name: "Codex",
    summary: "通过浏览器完成账号授权",
    badge: "推荐",
    accent: "green",
    initials: "C",
    logo: "/brands/codex.png",
  },
  {
    id: "deepseek",
    kind: "deepseek",
    name: "DeepSeek API",
    summary: "使用 API Key 连接模型",
    badge: "可配置",
    accent: "blue",
    initials: "D",
    logo: "/brands/deepseek.png",
  },
];

export function customProvider(id: ProviderId, name = "自定义 API"): ProviderDefinition {
  return {
    id,
    kind: "custom",
    name,
    summary: "兼容 OpenAI Chat Completions 格式",
    badge: "自定义",
    accent: "slate",
    initials: "A",
  };
}
