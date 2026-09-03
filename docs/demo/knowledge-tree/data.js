(function registerKnowledgeTreeData() {
const demoCards = [
  {
    id: "quadratic-inequality",
    subject: "数学",
    question: "解不等式：$x^2-5x+6>0$。",
    diagnosis: "混淆了开口向上的二次函数在两根内外的符号规律。",
    status: "已整理",
    updatedAt: "今天 18:42",
    learning: {
      core: "二次方程的实根把数轴分段；每一段内二次式的符号保持不变。",
      steps: "先求零点，再看二次项系数判断开口，最后按不等号选择图像在 x 轴上方或下方的区间。",
      correctAnswer: "$x<2$ 或 $x>3$",
      solution: "$(x-2)(x-3)>0$，两个因式同号，因此取两根外侧。",
      variant: { prompt: "解不等式：$x^2-7x+12<0$。", answer: "$3<x<4$", explanation: "零点为 3、4，开口向上，小于零取两根之间。" },
    },
    points: [
      { subject: "数学", chapter: "不等式", name: "一元二次不等式" },
      { subject: "数学", chapter: "函数", name: "函数图像" },
    ],
  },
  {
    id: "monotonicity",
    subject: "数学",
    question: "已知 $f(x)=x^3-3x$，求函数的单调区间。",
    diagnosis: "解 $f'(x)>0$ 时遗漏了 $x<-1$ 的分支。",
    status: "已整理",
    updatedAt: "今天 16:16",
    learning: {
      core: "导数大于零时函数递增，导数小于零时函数递减；导数为零的点用于划分讨论区间。",
      steps: "求导，解 $f'(x)=0$，画导数符号表，再写出对应的开区间。",
      correctAnswer: "递增：$(-\\infty,-1)$、$(1,+\\infty)$；递减：$(-1,1)$。",
      solution: "$f'(x)=3(x^2-1)$，在两根外侧为正、两根之间为负。",
      variant: { prompt: "求 $f(x)=x^3-12x$ 的单调区间。", answer: "递增：$(-\\infty,-2)$、$(2,+\\infty)$；递减：$(-2,2)$。", explanation: "$f'(x)=3(x-2)(x+2)$。" },
    },
    points: [{ subject: "数学", chapter: "函数", name: "函数单调性" }],
  },
  {
    id: "quadratic-boundary",
    subject: "数学",
    question: "解不等式：$x^2-5x+6\\leq0$。",
    diagnosis: "得出两根之间的区间后，遗漏了等号对应的边界点。",
    status: "已整理",
    updatedAt: "今天 17:20",
    learning: {
      core: "非严格不等式需要判断零点是否属于解集：含等号时通常保留有定义的零点。",
      steps: "完成符号区间判断后，单独检查每个零点，并根据 $<$、$>$、$\\leq$、$\\geq$ 决定端点开闭。",
      correctAnswer: "$2\\leq x\\leq3$",
      solution: "$(x-2)(x-3)\\leq0$，开口向上，小于零取两根之间，等于零保留两个端点。",
      variant: { prompt: "解不等式：$x^2-4x+3\\geq0$。", answer: "$x\\leq1$ 或 $x\\geq3$", explanation: "零点为 1、3，大于零取外侧，含等号所以保留端点。" },
    },
    points: [{ subject: "数学", chapter: "不等式", name: "一元二次不等式" }],
  },
  {
    id: "quadratic-factor",
    subject: "数学",
    question: "解不等式：$x^2+x-6>0$。",
    diagnosis: "因式分解后把零点 $-3$ 错写成 $3$，导致区间整体错误。",
    status: "已整理",
    updatedAt: "昨天 19:35",
    learning: {
      core: "因式分解得到 $(x-a)(x-b)$ 时，零点是 $a$、$b$；负号必须跟随因式一起核对。",
      steps: "因式分解后先把每个因式分别置零，再按从小到大标到数轴上，最后判断符号区间。",
      correctAnswer: "$x<-3$ 或 $x>2$",
      solution: "$(x+3)(x-2)>0$，零点为 $-3$、$2$，开口向上，大于零取两根外侧。",
      variant: { prompt: "解不等式：$x^2-2x-8<0$。", answer: "$-2<x<4$", explanation: "$(x+2)(x-4)<0$，小于零取两根之间。" },
    },
    points: [{ subject: "数学", chapter: "不等式", name: "一元二次不等式" }],
  },
  {
    id: "function-domain",
    subject: "数学",
    question: "求函数 $y=\sqrt{2x-1}$ 的定义域。",
    diagnosis: "忽略了被开方数必须非负。",
    status: "待完善",
    updatedAt: "昨天 21:08",
    learning: {
      core: "实数范围内，偶次根式的被开方数必须大于或等于零。",
      steps: "写出 $2x-1\\geq0$，解出 x 的范围，再用区间表示。",
      correctAnswer: "$[1/2,+\\infty)$",
      solution: "由 $2x-1\\geq0$ 得 $x\\geq1/2$。",
      variant: { prompt: "求 $y=\\sqrt{5-2x}$ 的定义域。", answer: "$(-\\infty,5/2]$", explanation: "令 $5-2x\\geq0$，注意除以负数时不等号变向。" },
    },
    points: [{ subject: "数学", chapter: "函数", name: "函数定义域" }],
  },
  {
    id: "congruence",
    subject: "数学",
    question: "在 $\triangle ABC$ 中，证明 $\angle B=\angle C$。",
    diagnosis: "尚未补充完整证明过程。",
    status: "待完善",
    updatedAt: "8 月 31 日",
    learning: {
      core: "证明两个角相等时，可以构造两个三角形并通过全等得到对应角相等。",
      steps: "明确待证角，寻找对应三角形，验证全等条件，再写出对应角相等。",
      correctAnswer: "$\\angle B=\\angle C$",
      solution: "作顶角平分线并证明两侧三角形全等，再由全等三角形对应角相等得证。",
      variant: { prompt: "等腰三角形顶角为 $40°$，求两个底角。", answer: "各为 $70°$。", explanation: "两底角相等，且三角形内角和为 $180°$。" },
    },
    points: [{ subject: "数学", chapter: "三角形", name: "全等三角形" }],
  },
  {
    id: "newton-second-law",
    subject: "物理",
    question: "质量为 $2kg$ 的物体受 $6N$ 合力，求加速度。",
    diagnosis: "没有统一质量与力的单位。",
    status: "已整理",
    updatedAt: "8 月 30 日",
    learning: {
      core: "牛顿第二定律 $F_{合}=ma$ 描述合力、质量与加速度的关系。",
      steps: "选研究对象，求合力，统一单位，代入 $a=F_{合}/m$，最后标明方向。",
      correctAnswer: "$3m/s^2$",
      solution: "$a=F/m=6/2=3m/s^2$。",
      variant: { prompt: "质量 $4kg$ 的物体受 $12N$ 合力，加速度多大？", answer: "$3m/s^2$", explanation: "$a=12/4=3m/s^2$。" },
    },
    points: [{ subject: "物理", chapter: "力学", name: "牛顿第二定律" }],
  },
  {
    id: "friction",
    subject: "物理",
    question: "分析斜面上静止物体所受的摩擦力。",
    diagnosis: "把静摩擦力直接写成最大静摩擦力。",
    status: "已整理",
    updatedAt: "8 月 29 日",
    learning: {
      core: "静摩擦力会在零到最大静摩擦力之间自适应，不能一律取最大值。",
      steps: "先判断相对运动趋势，再沿接触面方向列平衡或运动方程，反求摩擦力。",
      correctAnswer: "摩擦力大小由沿斜面方向的受力平衡确定。",
      solution: "静止时沿斜面方向合力为零，静摩擦力与其他沿斜面分力平衡。",
      variant: { prompt: "物体静止在粗糙水平面上且不受水平外力，静摩擦力多大？", answer: "零。", explanation: "没有相对运动趋势，不需要静摩擦力维持平衡。" },
    },
    points: [{ subject: "物理", chapter: "力学", name: "摩擦力" }],
  },
  {
    id: "series-circuit",
    subject: "物理",
    question: "两个电阻串联后接入电路，求总电阻。",
    diagnosis: "混用了并联电阻公式。",
    status: "已整理",
    updatedAt: "8 月 27 日",
    learning: {
      core: "串联电路中电流处处相等，总电阻等于各分电阻之和。",
      steps: "识别串联关系，使用 $R=R_1+R_2+\\cdots$，再结合欧姆定律求其他量。",
      correctAnswer: "$R=R_1+R_2$",
      solution: "串联时总电压等于各电阻电压之和，约去相同电流即可得到电阻相加。",
      variant: { prompt: "$3\\Omega$ 与 $5\\Omega$ 电阻串联，总电阻是多少？", answer: "$8\\Omega$", explanation: "$R=3+5=8\\Omega$。" },
    },
    points: [{ subject: "物理", chapter: "电学", name: "串联电路" }],
  },
];

const byLabel = (left, right) => left.label.localeCompare(right.label, "zh-CN");

function buildKnowledgeTree(cards) {
  const subjects = new Map();
  for (const card of cards) {
    for (const point of card.points) {
      const subject = subjects.get(point.subject) ?? { label: point.subject, cardIds: new Set(), children: new Map() };
      const chapter = subject.children.get(point.chapter) ?? { label: point.chapter, cardIds: new Set(), children: new Map() };
      const leaf = chapter.children.get(point.name) ?? { label: point.name, cardIds: new Set(), children: new Map() };
      subject.cardIds.add(card.id);
      chapter.cardIds.add(card.id);
      leaf.cardIds.add(card.id);
      chapter.children.set(point.name, leaf);
      subject.children.set(point.chapter, chapter);
      subjects.set(point.subject, subject);
    }
  }
  const convert = (node, level, trail) => ({
    label: node.label,
    level,
    key: [...trail, node.label].join("/"),
    count: node.cardIds.size,
    children: [...node.children.values()].sort(byLabel)
      .map((child) => convert(child, level + 1, [...trail, node.label])),
  });
  return [...subjects.values()].sort(byLabel).map((node) => convert(node, 1, []));
}

function filterTree(nodes, query) {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return nodes;
  const visit = (node) => {
    if (node.label.toLocaleLowerCase().includes(keyword)) return node;
    const children = node.children.map(visit).filter(Boolean);
    return children.length ? { ...node, children } : null;
  };
  return nodes.map(visit).filter(Boolean);
}

function filterCards(cards, selection) {
  if (!selection) return cards;
  return cards.filter((card) => card.points.some((point) =>
    point.subject === selection.subject
      && (!selection.chapter || point.chapter === selection.chapter)
      && (!selection.name || point.name === selection.name)));
}

globalThis.KnowledgeTreeData = { demoCards, buildKnowledgeTree, filterTree, filterCards };
})();
