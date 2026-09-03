export const ERROR_TYPES = [
  "概念不清",
  "方法错误",
  "公式或定理使用错误",
  "审题错误",
  "计算错误",
  "推理或步骤错误",
  "无法判断",
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];
export type CardStatus = "draft" | "organized";
export type CardKind = "mistake" | "practice";
export const UNCATEGORIZED_CHAPTER_FILTER = "__uncategorized__";

export type SourceRevision = { cardId: string; revision: number };

export type KnowledgePoint = {
  id?: string;
  subject: string;
  chapter?: string | null;
  name: string;
};

export type CardAsset = {
  id: string;
  relativePath: string;
  previewUrl?: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
};

export type CardInput = {
  subject: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  supplementalNote: string;
  solution: string;
  errorLocation: string;
  errorReason: string;
  errorType: ErrorType | "";
  knowledgePoints: KnowledgePoint[];
  assets: CardAsset[];
};

export type Card = CardInput & {
  id: string;
  kind?: CardKind;
  sourceRevisions?: SourceRevision[];
  status: CardStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type CardListItem = Pick<
  Card,
  | "id"
  | "subject"
  | "question"
  | "errorReason"
  | "errorType"
  | "knowledgePoints"
  | "assets"
  | "status"
  | "updatedAt"
>;

export type CardFilter = {
  query?: string;
  status?: CardStatus | "all";
  knowledgeSubject?: string;
  knowledgeChapter?: string;
  knowledgePoint?: string;
  kind?: CardKind | "all";
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export function calculateCardStatus(input: CardInput): CardStatus {
  if (!hasText(input.question) || input.knowledgePoints.length === 0) {
    return "draft";
  }

  if (hasText(input.userAnswer)) {
    const hasDiagnosis =
      (hasText(input.errorLocation) || hasText(input.errorReason)) &&
      hasText(input.errorType);
    return hasDiagnosis ? "organized" : "draft";
  }

  return hasText(input.solution) ? "organized" : "draft";
}

export function canSaveCard(input: CardInput): boolean {
  return hasText(input.question) || input.assets.length > 0;
}

export function validateCardInput(input: CardInput): string[] {
  const errors: string[] = [];
  if (!canSaveCard(input)) {
    errors.push("至少需要输入题目或添加一张图片");
  }
  if (input.knowledgePoints.length > 3) {
    errors.push("每张卡片最多关联 3 个主要知识点");
  }
  if (input.errorType && !ERROR_TYPES.includes(input.errorType)) {
    errors.push("错误类型无效");
  }
  return errors;
}

export function emptyCardInput(): CardInput {
  return {
    subject: "数学",
    question: "",
    userAnswer: "",
    correctAnswer: "",
    supplementalNote: "",
    solution: "",
    errorLocation: "",
    errorReason: "",
    errorType: "",
    knowledgePoints: [],
    assets: [],
  };
}
