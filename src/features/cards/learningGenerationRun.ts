import type {
  KnowledgeCardGenerationRequest, KnowledgeCardRecord, PracticeGenerationRequest,
} from "../../domain/ai";
import type { Card } from "../../domain/card";
import { aiService, type AiProgress, type AiService } from "../../services/aiService";
import { cardService, type CardService } from "../../services/cardService";
import { BackgroundAiRunStore } from "./backgroundAiRun";

export type KnowledgeGenerationInput = {
  key: string;
  subject: string;
  chapter?: string | null;
  name: string;
  request: KnowledgeCardGenerationRequest;
};

type LearningAi = Pick<
  AiService,
  "getStatus" | "connect" | "generateKnowledgeCard" | "generatePracticeCards" | "saveKnowledgeCard"
>;

async function ensureConnected(service: Pick<AiService, "getStatus" | "connect">) {
  let status = await service.getStatus();
  if (status.state !== "connected") status = await service.connect();
  if (status.state !== "connected") throw new Error(status.message || "AI 当前不可用");
}

export function createKnowledgeGenerationRunStore(service: LearningAi = aiService) {
  return new BackgroundAiRunStore<KnowledgeGenerationInput, KnowledgeCardRecord>(
    async (input, onProgress) => {
      onProgress({ stage: "preparing", message: "正在连接 AI…" });
      await ensureConnected(service);
      const content = await service.generateKnowledgeCard(input.request, onProgress);
      onProgress({ stage: "validating", message: "内容已生成，正在保存为待审核草稿…" });
      return service.saveKnowledgeCard({
        key: input.key, subject: input.subject, chapter: input.chapter,
        name: input.name, status: "draft", content,
      });
    },
    "知识卡片生成失败，原有内容已保留",
  );
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

export const knowledgeGenerationRuns = createKnowledgeGenerationRunStore();
export const practiceGenerationRuns = createPracticeGenerationRunStore();

export const initialKnowledgeProgress: AiProgress = {
  stage: "preparing", message: "正在准备来源错题与知识点…",
};

export const initialPracticeProgress: AiProgress = {
  stage: "preparing", message: "正在准备来源错题与难度要求…",
};
