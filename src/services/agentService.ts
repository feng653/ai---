import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AgentApprovalResult, AgentEventPayload, AgentRunResult, AgentStartTurnRequest,
  AgentToolManifest,
} from "../domain/agent";
import { BrowserAgentService } from "./browserAgentService";

export interface AgentService {
  readonly preview: boolean;
  listTools(): Promise<AgentToolManifest[]>;
  startTurn(
    request: AgentStartTurnRequest,
    onEvent: (payload: AgentEventPayload) => void,
  ): Promise<AgentRunResult>;
  cancel(runId: string): Promise<void>;
  resolveApproval(approvalId: string, approved: boolean): Promise<AgentApprovalResult>;
}

export class TauriAgentService implements AgentService {
  readonly preview = false;

  listTools(): Promise<AgentToolManifest[]> {
    return invoke("agent_list_tools");
  }

  async startTurn(
    request: AgentStartTurnRequest,
    onEvent: (payload: AgentEventPayload) => void,
  ): Promise<AgentRunResult> {
    const requestId = crypto.randomUUID();
    const unlisten = await listen<AgentEventPayload>("agent-event", ({ payload }) => {
      if (payload.requestId === requestId) onEvent(payload);
    });
    try {
      return await invoke("agent_start_turn", { requestId, request });
    } finally {
      unlisten();
    }
  }

  cancel(runId: string): Promise<void> {
    return invoke("agent_cancel_run", { runId });
  }

  resolveApproval(approvalId: string, approved: boolean): Promise<AgentApprovalResult> {
    return invoke("agent_resolve_approval", { request: { approvalId, approved } });
  }
}

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

export const agentService: AgentService = isTauri()
  ? new TauriAgentService()
  : new BrowserAgentService();
