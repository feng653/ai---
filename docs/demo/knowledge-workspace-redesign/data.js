export const cards = [
  {
    id: "derivative",
    subject: "数学",
    title: "函数单调区间与导数符号的完整对应",
    summary: "只验证了导数为正的区间，遗漏了中间递减区间。",
    status: "已整理",
    type: "步骤遗漏",
    updated: "今天 14:32",
    tags: ["函数与导数", "单调性"],
    wash: "#e7efe7",
    question: "已知函数 f(x)=x³−3x，求函数的单调区间。",
    mine: "(-∞,-1) 与 (1,+∞)",
    correct: "(-∞,-1) 与 (1,+∞) 递增；(-1,1) 递减。",
    solution: "求导得 f′(x)=3x²−3。以 x=−1、1 为分界点绘制导数符号表，再逐区间判断函数的增减性。",
    diagnosis: "遗漏导数小于零的区间，答案未覆盖完整定义域。"
  },
  {
    id: "ellipse",
    subject: "数学",
    title: "椭圆离心率的范围判断",
    summary: "把焦距 2c 与半焦距 c 混用，导致离心率超过 1。",
    status: "待完善",
    type: "概念混淆",
    updated: "昨天 20:18",
    tags: ["圆锥曲线", "离心率"],
    wash: "#f3eadb",
    question: "椭圆长轴长为 10，焦距为 8，求离心率。",
    mine: "e=8/5",
    correct: "e=c/a=4/5",
    solution: "长轴长 2a=10，所以 a=5；焦距 2c=8，所以 c=4，故 e=4/5。",
    diagnosis: "焦距是两焦点间距离 2c，不是参数 c。"
  },
  {
    id: "force",
    subject: "物理",
    title: "斜面模型中的受力分解",
    summary: "沿水平、竖直方向分解后方程复杂，未利用斜面方向。",
    status: "已整理",
    type: "路径选择",
    updated: "9 月 1 日",
    tags: ["受力分析", "牛顿定律"],
    wash: "#e5edf0",
    question: "质量为 m 的物块静止在倾角 θ 的斜面上，求支持力。",
    mine: "N=mg",
    correct: "N=mg cosθ",
    solution: "建立垂直斜面与沿斜面坐标轴。垂直斜面方向合力为零，因此 N−mg cosθ=0。",
    diagnosis: "支持力只平衡重力垂直斜面的分量。"
  },
  {
    id: "probability",
    subject: "数学",
    title: "条件概率中样本空间的更新",
    summary: "分母仍使用原样本空间，没有切换到已知事件。",
    status: "待完善",
    type: "定义误用",
    updated: "8 月 30 日",
    tags: ["条件概率", "样本空间"],
    wash: "#eee8f1",
    question: "已知抽到红球，求它来自甲箱的概率。",
    mine: "P(A∩B)/P(A)",
    correct: "P(A∩B)/P(B)",
    solution: "条件 B 已发生，因此新的样本空间为 B，分母应为 P(B)。",
    diagnosis: "条件概率的条件事件必须作为分母。"
  },
  {
    id: "momentum",
    subject: "物理",
    title: "碰撞过程中的动量守恒条件",
    summary: "忽略了研究系统所受外力冲量，需要先说明系统边界。",
    status: "已整理",
    type: "条件遗漏",
    updated: "8 月 28 日",
    tags: ["动量", "碰撞"],
    wash: "#e9eee4",
    question: "两小球在光滑水平面上碰撞，写出动量守恒式。",
    mine: "m₁v₁=m₂v₂",
    correct: "m₁v₁+m₂v₂=m₁v₁′+m₂v₂′",
    solution: "以两球为系统，水平方向外力冲量为零，碰撞前后系统总动量守恒。",
    diagnosis: "守恒量是系统总动量，不是两物体动量相等。"
  },
  {
    id: "sequence",
    subject: "数学",
    title: "递推数列通项的错位相减",
    summary: "相减时首尾项没有单独保留，常数项出现偏差。",
    status: "已整理",
    type: "计算错误",
    updated: "8 月 27 日",
    tags: ["数列", "递推"],
    wash: "#f2eadf",
    question: "已知 aₙ₊₁=2aₙ+1，求通项。",
    mine: "aₙ=2ⁿa₁+1",
    correct: "aₙ=2ⁿ⁻¹(a₁+1)−1",
    solution: "令 bₙ=aₙ+1，则 bₙ₊₁=2bₙ，转化为等比数列。",
    diagnosis: "直接展开时常数项求和错误。"
  }
];

export const providers = [
  { id: "codex", name: "Codex", summary: "知拾专用浏览器登录", logo: "codex.png", state: "当前使用", tone: "current" },
  { id: "deepseek", name: "DeepSeek", summary: "通过官方 API Key 连接", logo: "deepseek.png", state: "已配置", tone: "ready" }
];

export const modelOptions = {
  codex: ["自动选择", "gpt-5.6", "gpt-5.6-codex"],
  deepseek: ["deepseek-chat", "deepseek-reasoner", "自定义模型"]
};
