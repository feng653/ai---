globalThis.AgentHarnessDemoData = (() => {
  const cards = {
    monotonicity: {
      id: "card-math-017",
      revision: 4,
      subject: "数学",
      title: "已知函数 f(x)=x²−2ax+1，求其在区间上的单调性。",
      reason: "忽略了定义域端点对单调区间的影响。",
      solution: "先求对称轴 x=a，再根据 a 与区间端点的位置分类讨论。",
      points: ["函数单调性", "二次函数"],
    },
    friction: {
      id: "card-physics-006",
      revision: 2,
      subject: "物理",
      title: "斜面上的物体受到的摩擦力方向如何判断？",
      reason: "只依据运动方向判断，忽略了相对运动趋势。",
      solution: "先隔离物体，再判断接触面间的相对运动或运动趋势。",
      points: ["摩擦力", "受力分析"],
    },
  };

  const presets = [
    { id: "chat", label: "纯聊天", prompt: "你好，介绍一下你能做什么" },
    { id: "search", label: "查找并总结", prompt: "查找函数单调性的错题并总结我的常见问题" },
    { id: "update", label: "修改卡片", prompt: "把函数单调性卡片的解题过程改得更清楚" },
    { id: "delete", label: "删除演示", prompt: "删除那张摩擦力错题卡片" },
  ];

  return { cards, presets };
})();
