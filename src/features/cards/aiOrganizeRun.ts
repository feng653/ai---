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

  start(key: string, input: CardInput, baseRevision: number): void {
    if (this.get(key).status === "running") return;
    const operationId = crypto.randomUUID();
    const base = structuredClone(input);
    this.set(key, {
      status: "running", operationId, input: base,
      progress: { stage: "preparing", message: "正在启动 AI 整理…" },
    });
    void this.execute(key, operationId, base, baseRevision);
  }

  dismiss(key: string): void {
    if (this.get(key).status === "running") return;
    this.runs.delete(key);
    this.emit(key);
  }

  private async execute(
    key: string,
    operationId: string,
    input: CardInput,
    baseRevision: number,
  ): Promise<void> {
    try {
      const proposal = await this.service.organize(input, baseRevision, (progress) => {
        if (!this.isCurrent(key, operationId)) return;
        this.set(key, { status: "running", operationId, input, progress });
      });
      if (this.isCurrent(key, operationId)) {
        this.set(key, { status: "succeeded", operationId, input, proposal });
      }
    } catch (error) {
      if (this.isCurrent(key, operationId)) {
        this.set(key, {
          status: "failed", operationId, input,
          message: errorMessage(error, "AI 整理失败，原始内容已保留"),
        });
      }
    }
  }

  private isCurrent(key: string, operationId: string): boolean {
    const run = this.runs.get(key);
    return Boolean(run && "operationId" in run && run.operationId === operationId);
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
