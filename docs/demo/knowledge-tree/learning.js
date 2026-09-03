(function registerKnowledgeTreeLearning() {
const { filterCards } = globalThis.KnowledgeTreeData;

const distinct = (values) => [...new Set(values.filter(Boolean))];

function buildLearningContext(cards, selection) {
  if (!selection?.name) return null;
  const sources = filterCards(cards, selection);
  if (!sources.length) return null;
  const topic = selection.name;
  const core = distinct(sources.map((card) => card.learning?.core));
  const steps = distinct(sources.map((card) => card.learning?.steps));
  const mistakes = distinct(sources.map((card) => card.diagnosis));
  return {
    topic, subject: selection.subject, chapter: selection.chapter,
    sourceIds: sources.map((card) => card.id),
    sourceLabels: sources.map((card) => card.question),
    updatedAt: sources[0].updatedAt,
    coverage: sources.length >= 3 ? "证据较充分" : sources.length === 2 ? "持续积累" : "初始卡片",
    misconceptions: sources.map((card) => ({
      cardId: card.id, question: card.question, diagnosis: card.diagnosis,
    })),
    tutorial: {
      title: `${topic} · 知识卡片`,
      objectives: [`说清“${topic}”的适用条件`, "独立复述解题步骤", "避开已经出现过的错误"],
      sections: [
        { title: "核心认识", content: core.join("\n") },
        { title: "解题路径", content: steps.join("\n") },
        { title: "你的易错提醒", content: mistakes.join("\n") },
      ],
    },
    questions: buildQuestions(sources, topic),
  };
}

function buildKnowledgeCards(cards, selection) {
  const visibleCards = filterCards(cards, selection);
  const leaves = new Map();
  for (const card of visibleCards) {
    for (const point of card.points) {
      if (selection?.subject && point.subject !== selection.subject) continue;
      if (selection?.chapter && point.chapter !== selection.chapter) continue;
      if (selection?.name && point.name !== selection.name) continue;
      const key = `${point.subject}/${point.chapter}/${point.name}`;
      leaves.set(key, { key, subject: point.subject, chapter: point.chapter, name: point.name });
    }
  }
  return [...leaves.values()].map((leaf) => {
    const context = buildLearningContext(cards, leaf);
    return {
      ...leaf, sourceCount: context.sourceIds.length,
      mistakeCount: context.misconceptions.length,
      coverage: context.coverage,
    };
  }).sort((left, right) => right.sourceCount - left.sourceCount || left.name.localeCompare(right.name, "zh-CN"));
}

function buildQuestions(sources, topic) {
  const card = sources[0];
  const questions = [
    {
      id: `${card.id}-variant`, kind: "变式练习",
      prompt: card.learning.variant.prompt, answer: card.learning.variant.answer,
      explanation: card.learning.variant.explanation, sourceIds: [card.id],
    },
    ...sources.slice(0, 2).map((source) => ({
      id: `${source.id}-retry`, kind: "原题再练",
      prompt: source.question, answer: source.learning.correctAnswer,
      explanation: source.learning.solution, sourceIds: [source.id],
    })),
    {
      id: `${card.id}-diagnosis`, kind: "错因辨析",
      prompt: `综合这些“${topic}”错题，列出解题后最值得执行的两项检查。`,
      answer: distinct(sources.map((source) => source.diagnosis)).join("；"),
      explanation: `自检策略：${distinct(sources.map((source) => source.learning.steps)).join("；")}`,
      sourceIds: sources.map((source) => source.id),
    },
    {
      id: `${card.id}-method`, kind: "方法复述",
      prompt: `不直接照抄答案，复述解决“${topic}”题的关键步骤。`,
      answer: card.learning.steps,
      explanation: card.learning.solution,
      sourceIds: [card.id],
    },
    {
      id: `${card.id}-check`, kind: "自检清单",
      prompt: `完成下一道“${topic}”题后，你应重点检查什么？`,
      answer: distinct(sources.map((source) => source.diagnosis)).join("；"),
      explanation: `结合来源错题执行：${card.learning.steps}`,
      sourceIds: sources.map((source) => source.id),
    },
  ];
  return questions;
}

globalThis.KnowledgeTreeLearning = { buildLearningContext, buildKnowledgeCards };
})();
