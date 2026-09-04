import type { AiProgress } from "../../services/aiService";
import { errorMessage } from "../../services/errorMessage";

export type BackgroundAiRun<Input, Result> =
  | { status: "idle" }
  | { status: "running"; operationId: string; input: Input; progress: AiProgress }
  | { status: "succeeded"; operationId: string; input: Input; result: Result }
  | { status: "failed"; operationId: string; input: Input; message: string };

type Runner<Input, Result> = (
  input: Input,
  onProgress: (progress: AiProgress) => void,
) => Promise<Result>;

const idleRun: BackgroundAiRun<never, never> = Object.freeze({ status: "idle" });

export class BackgroundAiRunStore<Input, Result> {
  private readonly runs = new Map<string, BackgroundAiRun<Input, Result>>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly allListeners = new Set<() => void>();
  private version = 0;

  constructor(
    private readonly runner: Runner<Input, Result>,
    private readonly fallbackError: string,
  ) {}

  get(key: string): BackgroundAiRun<Input, Result> {
    return this.runs.get(key) ?? idleRun as BackgroundAiRun<Input, Result>;
  }

  getVersion(): number {
    return this.version;
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

  subscribeAll(listener: () => void): () => void {
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  }

  start(key: string, input: Input, initialProgress: AiProgress): void {
    if (this.get(key).status === "running") return;
    const operationId = crypto.randomUUID();
    const frozenInput = structuredClone(input);
    this.set(key, { status: "running", operationId, input: frozenInput, progress: initialProgress });
    void this.execute(key, operationId, frozenInput);
  }

  dismiss(key: string): void {
    if (this.get(key).status === "running") return;
    this.runs.delete(key);
    this.emit(key);
  }

  private async execute(key: string, operationId: string, input: Input): Promise<void> {
    try {
      const result = await this.runner(input, (progress) => {
        if (this.isCurrent(key, operationId)) {
          this.set(key, { status: "running", operationId, input, progress });
        }
      });
      if (this.isCurrent(key, operationId)) {
        this.set(key, { status: "succeeded", operationId, input, result });
      }
    } catch (error) {
      if (this.isCurrent(key, operationId)) {
        this.set(key, {
          status: "failed", operationId, input,
          message: errorMessage(error, this.fallbackError),
        });
      }
    }
  }

  private isCurrent(key: string, operationId: string): boolean {
    const current = this.runs.get(key);
    return Boolean(current && "operationId" in current && current.operationId === operationId);
  }

  private set(key: string, run: BackgroundAiRun<Input, Result>): void {
    this.runs.set(key, run);
    this.emit(key);
  }

  private emit(key: string): void {
    this.version += 1;
    this.listeners.get(key)?.forEach((listener) => listener());
    this.allListeners.forEach((listener) => listener());
  }
}
