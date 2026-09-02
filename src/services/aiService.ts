import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AiProposal, AiProviderId, AiProviderStatus, AiProviderSummary, ApiProviderInput,
} from "../domain/ai";
import type { CardInput } from "../domain/card";

export type AiProgress = {
  stage: "preparing" | "analyzing" | "validating";
  message: string;
};

type AiProgressEvent = AiProgress & { requestId: string };

export interface AiService {
  getStatus(): Promise<AiProviderStatus>;
  connect(): Promise<AiProviderStatus>;
  listProviders(): Promise<AiProviderSummary[]>;
  selectProvider(id: AiProviderId): Promise<AiProviderStatus>;
  saveApiProvider(input: ApiProviderInput): Promise<AiProviderStatus>;
  testApiProvider(input: ApiProviderInput): Promise<void>;
  loginCodex(): Promise<AiProviderStatus>;
  disconnectProvider(id: AiProviderId): Promise<void>;
  organize(
    input: CardInput,
    baseRevision: number,
    onProgress?: (progress: AiProgress) => void,
    agentInstruction?: string,
    agentHistory?: string[],
    agentTarget?: boolean,
    agentWebSearch?: boolean,
  ): Promise<AiProposal>;
}

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const browserStatus: AiProviderStatus = {
  state: "unavailable",
  provider: "codex",
  message: "AI 接入仅在知拾桌面应用中可用",
};

const desktopOnly = () => new Error(browserStatus.message);

export class BrowserUnavailableAiService implements AiService {
  async getStatus(): Promise<AiProviderStatus> {
    return browserStatus;
  }

  async connect(): Promise<AiProviderStatus> {
    return browserStatus;
  }

  async listProviders(): Promise<AiProviderSummary[]> {
    return ["codex", "deepseek"].map((id) => ({
      id: id as AiProviderId, name: id, state: "unavailable", message: browserStatus.message,
      active: id === "codex", configured: false,
    }));
  }

  async selectProvider(): Promise<AiProviderStatus> { throw desktopOnly(); }
  async saveApiProvider(): Promise<AiProviderStatus> { throw desktopOnly(); }
  async testApiProvider(): Promise<void> { throw desktopOnly(); }
  async loginCodex(): Promise<AiProviderStatus> { throw desktopOnly(); }
  async disconnectProvider(): Promise<void> { throw desktopOnly(); }

  async organize(): Promise<AiProposal> {
    throw new Error(browserStatus.message);
  }
}

export class TauriAiService implements AiService {
  getStatus(): Promise<AiProviderStatus> {
    return invoke("get_ai_provider_status");
  }

  connect(): Promise<AiProviderStatus> {
    return invoke("connect_ai_provider");
  }

  listProviders(): Promise<AiProviderSummary[]> {
    return invoke("list_ai_providers");
  }

  selectProvider(id: AiProviderId): Promise<AiProviderStatus> {
    return invoke("select_ai_provider", { id });
  }

  saveApiProvider(input: ApiProviderInput): Promise<AiProviderStatus> {
    return invoke("save_api_provider", { input });
  }

  testApiProvider(input: ApiProviderInput): Promise<void> {
    return invoke("test_api_provider", { input });
  }

  loginCodex(): Promise<AiProviderStatus> {
    return invoke("login_codex_provider");
  }

  disconnectProvider(id: AiProviderId): Promise<void> {
    return invoke("disconnect_ai_provider", { id });
  }

  async organize(
    input: CardInput,
    baseRevision: number,
    onProgress?: (progress: AiProgress) => void,
    agentInstruction?: string,
    agentHistory?: string[],
    agentTarget = false,
    agentWebSearch = false,
  ): Promise<AiProposal> {
    const requestId = crypto.randomUUID();
    const unlisten = await listen<AiProgressEvent>("ai-progress", (event) => {
      if (event.payload.requestId !== requestId) return;
      onProgress?.({ stage: event.payload.stage, message: event.payload.message });
    });
    try {
      return await invoke("organize_card", {
        input, baseRevision, requestId,
        agentTurn: agentInstruction?.trim() ? {
          instruction: agentInstruction.trim(), history: agentHistory?.slice(-8) ?? [],
          targetProvided: agentTarget, webSearch: agentWebSearch,
        } : null,
      });
    } finally {
      unlisten();
    }
  }
}

export const aiService: AiService = isTauri()
  ? new TauriAiService()
  : new BrowserUnavailableAiService();
