(() => {
const STORAGE_KEY = "zhishi-agent-card-prototype-v4";

const knowledgeCards = [
  { id: "K-21", type: "易错细节", title: "导数符号表要覆盖全部区间", body: "以临界点切分定义域，逐段判断导数符号。写完后用区间并集反查，避免只记录递增区间。", points: ["导数与单调性", "区间表示", "符号表"], updated: "今天 10:24", status: "已保存" },
  { id: "K-18", type: "判断清单", title: "边界点与单调区间端点", body: "临界点用于切分区间，但端点是否写入要结合定义域、连续性和题目约定判断。", points: ["导数与单调性", "函数定义域"], updated: "昨天 21:08", status: "已保存" },
  { id: "K-11", type: "方法", title: "从定义域反查遗漏区间", body: "答案完成后，检查所有单调区间的并集与临界点能否覆盖原定义域。", points: ["函数定义域", "单调区间"], updated: "9 月 2 日", status: "已保存" },
  { id: "K-09", type: "概念", title: "驻点不一定是极值点", body: "导数为零只是候选条件；还需要比较两侧导数符号或使用其他判定。", points: ["极值", "导数"], updated: "8 月 30 日", status: "已保存" },
  { id: "K-05", type: "自定义 · 复盘", title: "待补充的极值复盘", body: "", points: ["极值"], updated: "8 月 28 日", status: "待补充" },
];

const mistakes = [
  { id: "E-104", title: "函数单调性的第一处错误", question: "已知 f(x)=x³−3x，求函数的单调区间。", answer: "只写了递增区间。", solution: "令 f′(x)=3x²−3，以 −1、1 切分区间。", points: ["导数与单调性", "符号表"], updated: "今天" },
  { id: "E-097", title: "漏写导数为负的区间", question: "判断函数 x+1/x 的单调性。", answer: "遗漏了定义域断点。", solution: "先写定义域，再分别讨论两个连续区间。", points: ["函数定义域", "导数与单调性"], updated: "昨天" },
  { id: "E-083", title: "极值点与驻点混淆", question: "判断 x³ 在 x=0 处是否取得极值。", answer: "误判为极小值。", solution: "两侧导数同号，所以不是极值点。", points: ["极值", "导数"], updated: "9 月 1 日" },
];

const exercises = [
  { id: "P-601", question: "f′(x) 在 (−∞,−1) 为正、(−1,1) 为负、(1,+∞) 为正。写出单调区间。", answer: "递增：(−∞,−1)、(1,+∞)；递减：(−1,1)。", solution: "按导数符号直接判断，并用两个临界点分隔区间。", points: ["导数与单调性"], status: "doubt" },
  { id: "P-602", question: "若 x=0 是驻点，能否直接断定它是极值点？", answer: "不能。", solution: "还要检查驻点两侧的函数变化或导数符号是否改变。", points: ["极值", "导数"], status: "mastered" },
  { id: "P-603", question: "函数定义域在 x=2 处断开，写单调区间时应如何处理？", answer: "在 x=2 处分开书写，不能跨越断点合并区间。", solution: "单调性只在定义域内的连续区间上讨论。", points: ["函数定义域", "单调区间"], status: "unmarked" },
  { id: "P-604", question: "完成单调区间后，怎样快速检查是否漏写？", answer: "用所有区间与临界点反查是否覆盖定义域。", solution: "这是结构性复核，不替代对答案正确性的人工判断。", points: ["符号表", "函数定义域"], status: "unmarked" },
];

const batches = [
  { id: "B-06", title: "导数边界与符号表强化", date: "今天 10:32", meta: "4 题 · 3 个来源 · 中等 · 概念辨析", exerciseIds: exercises.map((item) => item.id) },
  { id: "B-05", title: "极值与最值混合练习", date: "9 月 2 日", meta: "8 题 · 2 个来源 · 中等 · 混合", exerciseIds: ["P-602", "P-603"] },
];

function defaults() {
  return {
    page: "knowledge", view: "knowledge-list", selectedCardId: "K-21", selectedBatchId: "B-06",
    previousView: "knowledge-list", flipIndex: 0, flipSide: "front", filterStatus: "all", manageMode: false,
    knowledgeFilters: { text: "", point: "all", type: "all" },
    selectedExercises: [], pickerKind: "practice", pickerTab: "knowledge", pickerPreviewId: "K-21",
    selectedSources: { knowledge: ["K-21", "K-18"], mistakes: ["E-104"] },
    panel: { open: false, kind: "practice" },
    config: { count: 6, difficulty: "medium", template: "concept", prompt: "重点检查边界点和符号表。", knowledgeCount: "auto", maxCards: 3 },
    proposalIndex: 0, proposalStates: ["pending", "pending", "pending"],
    agent: { open: false, task: "", status: "idle", label: "准备就绪", badge: "", phase: 0 },
  };
}

function load() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return defaults(); }
}

const state = load();
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function reset() { Object.assign(state, defaults()); persist(); }

window.AgentPrototypeData = { batches, exercises, knowledgeCards, mistakes, persist, reset, state };
})();
