import type {
  PracticeGenerationRequest,
} from "../../domain/ai";
import type { Card } from "../../domain/card";
import { aiService, type AiProgress, type AiService } from "../../services/aiService";
import { cardService, type CardService } from "../../services/cardService";
import { BackgroundAiRunStore } from "./backgroundAiRun";

type LearningAi = Pick<
  AiService,
  "getStatus" | "connect" | "generatePracticeCards"
>;

async function ensureConnected(service: Pick<AiService, "getStatus" | "connect">) {
  let status = await service.getStatus();
  if (status.state !== "connected") status = await service.connect();
  if (status.state !== "connected") throw new Error(status.message || "AI 当前不可用");
}

export function createPracticeGenerationRunStore(
  service: LearningAi = aiService,
  cards: Pick<CardService, "savePracticeCards"> = cardService,
) {
  return new BackgroundAiRunStore<PracticeGenerationRequest, Card[]>(
    async (input, onProgress) => {
      onProgress({ stage: "preparing", message: "正在连接 AI…" });
      await ensureConnected(service);
      const drafts = await service.generatePracticeCards(input, onProgress);
      onProgress({ stage: "validating", message: "题目已生成，正在自动加入练习题库…" });
      return cards.savePracticeCards(drafts);
    },
    "复习题生成失败，请检查 AI 服务后重试",
  );
}

export const practiceGenerationRuns = createPracticeGenerationRunStore();


export const initialPracticeProgress: AiProgress = {
  stage: "preparing", message: "正在准备来源错题与难度要求…",
};
