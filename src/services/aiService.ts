import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AiProposal, AiProviderStatus } from "../domain/ai";
import type { CardInput } from "../domain/card";

export type AiProgress = {
  stage: "preparing" | "analyzing" | "validating";
  message: string;
};

type AiProgressEvent = AiProgress & { requestId: string };

export interface AiService {
  getStatus(): Promise<AiProviderStatus>;
  connect(): Promise<AiProviderStatus>;
  organize(
    input: CardInput,
    baseRevision: number,
    onProgress?: (progress: AiProgress) => void,
    agentInstruction?: string,
  ): Promise<AiProposal>;
}

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const browserStatus: AiProviderStatus = {
  state: "unavailable",
  provider: "codex-cli",
  message: "真实 Codex 接入仅在知拾桌面应用中可用",
};

export class BrowserUnavailableAiService implements AiService {
  async getStatus(): Promise<AiProviderStatus> {
    return browserStatus;
  }

  async connect(): Promise<AiProviderStatus> {
    return browserStatus;
  }

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

  async organize(
    input: CardInput,
    baseRevision: number,
    onProgress?: (progress: AiProgress) => void,
    agentInstruction?: string,
  ): Promise<AiProposal> {
    const requestId = crypto.randomUUID();
    const unlisten = await listen<AiProgressEvent>("ai-progress", (event) => {
      if (event.payload.requestId !== requestId) return;
      onProgress?.({ stage: event.payload.stage, message: event.payload.message });
    });
    try {
      return await invoke("organize_card", {
        input, baseRevision, requestId, agentInstruction: agentInstruction?.trim() || null,
      });
    } finally {
      unlisten();
    }
  }
}

export const aiService: AiService = isTauri()
  ? new TauriAiService()
  : new BrowserUnavailableAiService();
