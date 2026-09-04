import type { AiProposal } from "../../domain/ai";
import type { CardInput } from "../../domain/card";
import { aiService, type AiProgress, type AiService } from "../../services/aiService";
import { errorMessage } from "../../services/errorMessage";

export type AiOrganizeRun =
  | { status: "idle" }
  | { status: "running"; operationId: string; input: CardInput; progress: AiProgress }
  | { status: "succeeded"; operationId: string; input: CardInput; proposal: AiProposal }
  | { status: "failed"; operationId: string; input: CardInput; message: string };

const idleRun: AiOrganizeRun = Object.freeze({ status: "idle" });

export class AiOrganizeRunStore {
  private readonly runs = new Map<string, AiOrganizeRun>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly operationKeys = new Map<string, string>();

  constructor(private readonly service: Pick<AiService, "organize"> = aiService) {}

  get(key: string): AiOrganizeRun {
    return this.runs.get(key) ?? idleRun;
  }

  subscribe(key: string, listener: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }

  start(key: string, input: CardInput, baseRevision: number, additionalRequirements = ""): void {
    if (this.get(key).status === "running") return;
    const operationId = crypto.randomUUID();
    const base = structuredClone(input);
    this.operationKeys.set(operationId, key);
    this.set(key, {
      status: "running", operationId, input: base,
      progress: { stage: "preparing", message: "正在启动 AI 整理…" },
    });
    void this.execute(operationId, base, baseRevision, additionalRequirements.trim());
  }

  dismiss(key: string): void {
    if (this.get(key).status === "running") return;
    this.discard(key);
  }

  move(from: string, to: string): void {
    const run = this.runs.get(from);
    if (!run || from === to) return;
    this.runs.delete(from);
    this.runs.set(to, run);
    if ("operationId" in run) this.operationKeys.set(run.operationId, to);
    this.emit(from);
    this.emit(to);
  }

  discard(key: string): void {
    const run = this.runs.get(key);
    if (run && "operationId" in run) this.operationKeys.delete(run.operationId);
    this.runs.delete(key);
    this.emit(key);
  }

  private async execute(
    operationId: string,
    input: CardInput,
    baseRevision: number,
    additionalRequirements: string,
  ): Promise<void> {
    try {
      const proposal = await this.service.organize(input, baseRevision, (progress) => {
        const currentKey = this.currentKey(operationId);
        if (currentKey) this.set(currentKey, { status: "running", operationId, input, progress });
      }, undefined, undefined, undefined, undefined, additionalRequirements);
      const currentKey = this.currentKey(operationId);
      if (currentKey) {
        this.set(currentKey, { status: "succeeded", operationId, input, proposal });
      }
    } catch (error) {
      const currentKey = this.currentKey(operationId);
      if (currentKey) {
        this.set(currentKey, {
          status: "failed", operationId, input,
          message: errorMessage(error, "AI 整理失败，原始内容已保留"),
        });
      }
    }
  }

  private currentKey(operationId: string): string | undefined {
    const key = this.operationKeys.get(operationId);
    if (!key) return undefined;
    const run = this.runs.get(key);
    return run && "operationId" in run && run.operationId === operationId ? key : undefined;
  }

  private set(key: string, run: AiOrganizeRun): void {
    this.runs.set(key, run);
    this.emit(key);
  }

  private emit(key: string): void {
    this.listeners.get(key)?.forEach((listener) => listener());
  }
}

export const aiOrganizeRuns = new AiOrganizeRunStore();
