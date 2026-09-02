import type { DemoAttachment, DemoCard, DemoMessage, DemoProposal } from "./types";

export const initialDemoCards: DemoCard[] = [
  {
    id: "demo-derivative",
    subject: "数学",
    question: "已知 $f(x)=x^3-3x$，求函数的单调区间。",
    correctAnswer: "递增区间为 $(-\\infty,-1)$ 与 $(1,+\\infty)$。",
    errorReason: "解 $x^2>1$ 时遗漏了 $x<-1$。",
    status: "organized",
  },
  {
    id: "demo-image-card",
    subject: "数学",
    question: "仅有题目图片，等待整理。",
    correctAnswer: "",
    errorReason: "",
    status: "draft",
  },
];

export const initialDemoMessages: DemoMessage[] = [
  {
    id: "welcome",
    role: "agent",
    text: "这是 AI Agent 功能演示。你可以拖入题目图片让我创建卡片，或输入“修改导数卡片的错因”。所有操作都要经过你确认。",
  },
];

let sequence = 0;
export const demoId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`;

export function buildDemoProposal(text: string, attachments: DemoAttachment[]): DemoProposal {
  const update = /修改|更新|改成|补充/.test(text);
  if (update) {
    return {
      id: demoId("proposal"),
      kind: "update",
      targetId: "demo-derivative",
      patch: { errorReason: "由 $x^2>1$ 推导时只保留了正数分支，应同时考虑 $x<-1$。" },
      changes: [
        { label: "目标卡片", value: "导数与单调区间" },
        { label: "错误原因", value: "由 $x^2>1$ 推导时只保留了正数分支，应同时考虑 $x<-1$。" },
      ],
      status: "pending",
    };
  }
  const fromImage = attachments.length > 0;
  const patch: Partial<DemoCard> = {
    subject: "数学",
    question: fromImage ? "解不等式 $x^2>4$。" : (text || "解不等式 $x^2>4$。"),
    correctAnswer: "$x<-2$ 或 $x>2$",
    errorReason: "平方不等式需要同时考虑正、负两个分支。",
    status: "organized",
  };
  return {
    id: demoId("proposal"),
    kind: "create",
    patch,
    changes: [
      { label: "题目", value: patch.question! },
      { label: "正确答案", value: patch.correctAnswer! },
      { label: "错误原因", value: patch.errorReason! },
    ],
    status: "pending",
  };
}

export function applyDemoProposal(cards: DemoCard[], proposal: DemoProposal): DemoCard[] {
  if (proposal.kind === "update") {
    return cards.map((card) => card.id === proposal.targetId ? { ...card, ...proposal.patch } : card);
  }
  return [{
    id: demoId("card"), subject: "数学", question: "", correctAnswer: "",
    errorReason: "", status: "draft", ...proposal.patch,
  }, ...cards];
}
