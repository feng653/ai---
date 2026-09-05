(() => {
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function chip(text) { return `<span class="context-chip">${escapeHtml(text)}</span>`; }
function action(label, name, kind = "secondary", extra = "") {
  return `<button class="button ${kind}" type="button" data-action="${name}" ${extra}>${escapeHtml(label)}</button>`;
}
function pageMeta(state) {
  if (state.view === "source-picker") return { eyebrow: "AI 任务 / 明确选择上下文", title: "选择任务来源", context: "尚未提交的来源草稿", chips: ["加入/移出使用明确按钮", "取消不会改变任务"], help: "只有点击“确认来源”才会提交本次选择；浏览卡片不会自动加入。", search: false };
  if (state.view === "mistake-review") return { eyebrow: "错题创建 / AI 整理建议", title: "逐字段审核", context: "建议尚未写入", chips: ["先应用到编辑草稿", "再明确保存卡片"], help: "字段操作写明“采用/不采用”；AI 结果不会直接覆盖草稿。", search: false };
  if (state.view === "knowledge-review") return { eyebrow: "知识卡片 / Agent 草稿", title: "审核知识卡草稿", context: "1 个知识点聚合版本", chips: ["来源 revision 已冻结", "上一正式版保留"], help: "保存新草稿才替换当前正式版本；放弃会恢复上一版本。", search: false };
  if (state.view === "knowledge-editor") return { eyebrow: "知识卡片 / 编辑", title: state.selectedCardId === "new" ? "新增知识卡" : "编辑知识卡", context: "本地草稿自动保存", chips: ["显式保存 revision", "支持 Markdown / 公式"], help: "手工编辑始终可用，不依赖 AI。", search: false };
  if (state.view === "knowledge-detail") return { eyebrow: "知识卡片 / 详情", title: "知识卡详情", context: "当前卡片", chips: ["来源 revision 可追溯", "revision 4"], help: "需要 AI 时，从唯一 Agent 入口创建任务。", search: false };
  if (state.view === "practice-review") return { eyebrow: "练习题库 / 批次复习", title: "翻面练习", context: `${state.flipIndex + 1} / 4`, chips: ["状态即时保存", "固定顺序"], help: "练习修改从 Agent 内发起，页面只承担复习和手工编辑。", search: false };
  if (state.view === "practice-filter") return { eyebrow: "练习题库 / 全部批次", title: "按掌握状态复习", context: "跨批次筛选", chips: ["弱化批次分组", "点击开始序列"], help: "筛选不改变卡片状态。", search: false };
  if (state.view === "practice-edit") return { eyebrow: "练习题库 / 编辑", title: "编辑练习卡", context: "手工编辑", chips: ["仅选已有知识点", "保持掌握状态"], help: "保存内容 revision 与掌握状态更新彼此独立。", search: false };
  const meta = {
    capture: { eyebrow: "错题创建 / 照片采集", title: "新建错题", context: "草稿 D-091", chips: ["图片已暂存", "正式保存需确认"], help: "“AI 整理这道错题”直接派发任务；右下角 Agent 只负责打开工作区。", search: false },
    mistakes: { eyebrow: "错题库 / 导数与函数性质", title: "错题详情", context: "错题 E-104", chips: ["revision 7", "可手工编辑"], help: "页面不再提供重复的 Agent 操作入口。", search: true },
    knowledge: { eyebrow: "知识卡片 / 最近修改", title: "知识卡片", context: "5 个具体知识点", chips: ["按知识点聚合", "来源可追溯"], help: "生成或完善知识卡从 Agent 首页开始，并明确选择来源错题。", search: true },
    practice: { eyebrow: "练习题库 / 按批次", title: "练习题库", context: "2 个批次", chips: ["共 12 题", "可批量管理"], help: "生成练习从 Agent 首页开始；批量选择只在管理模式出现。", search: true },
  };
  return meta[state.page] || meta.capture;
}
function mistakeDetail() {
  return `<div class="canvas-head"><div><span class="section-kicker">MISTAKE · E-104</span><h2>函数单调性的第一处错误</h2><p>这是一张已保存卡片。手工编辑与复习不依赖 Agent。</p></div>${action("返回新建错题", "capture-new")}</div>
  <div class="mistake-layout"><article class="surface-card problem-card"><div class="card-topline"><span class="subject-tag">数学</span><span class="soft-tag">导数与单调性</span><time>revision 7</time></div><h3>已知函数 f(x)=x³−3x，求函数的单调区间。</h3><div class="equation">f′(x) = 3x² − 3</div><p>我的答案：在 (−∞,−1) 和 (1,+∞) 上递增。</p></article><aside class="detail-list"><div class="detail-row"><span>正确答案</span><p>另有 (−1,1) 上递减。</p></div><div class="detail-row"><span>第一处错误</span><p>遗漏了导数为负的连续区间。</p></div><div class="detail-row"><span>错误原因</span><p>把“求单调区间”缩减成“求递增区间”。</p></div></aside></div>`;
}
function mistakeReview(state) {
  const task = state.tasks.find((item) => item.id === state.capture.taskId);
  const sourceRole = task?.origin === "agent" ? "owned_upload" : "borrowed";
  const rows = [
    ["第一处错误", "尚未整理", "遗漏了 (−1,1) 上的递减区间。", "图片中的答案只列出两个递增区间", "确定"],
    ["错误原因", "尚未整理", "把“求单调区间”缩减成了“求递增区间”。", "根据题干与手写答案推断", "推断"],
    ["改进动作", "无", "按临界点画完整符号表，再用定义域反查遗漏。", "基于已有知识点生成", "建议"],
  ];
  const selected = state.capture.fieldChoices.filter(Boolean).length;
  return `<div class="review-head"><div><span class="section-kicker">FIELD PROPOSAL · ${state.capture.taskId || "T-001"}</span><h2>对照原图，决定哪些字段进入草稿</h2><p>当前已采用 ${selected} / ${rows.length} 项；每个按钮都写明结果，不使用裸勾选框。</p></div>${action("返回创建页", "capture-new")}</div>
  <div class="mistake-review-layout"><aside class="evidence-panel"><span>来源照片 · ${sourceRole}</span><div class="evidence-photo">${icon("photo")}<strong>${escapeHtml(task?.scope || "第 44 题（2）")}</strong></div><p>${sourceRole === "borrowed" ? "原图属于创建草稿，取消任务或拒绝建议都不会删除它。" : "原图由 Agent 任务暂存；生成提案后仍会保留到你完成审核。"}</p></aside>
  <section class="field-review"><div class="field-review-labels"><span>字段与决定</span><span>当前内容</span><span>AI 建议 / 依据</span></div>${rows.map(([field, before, after, evidence, confidence], index) => {
    const adopted = state.capture.fieldChoices[index];
    return `<article class="field-review-row ${adopted ? "adopted" : ""}"><div><strong>${field}</strong><button type="button" data-field-choice="${index}" aria-pressed="${adopted}">${adopted ? "已采用 · 点此不采用" : "不采用 · 点此采用"}</button></div><p>${before}</p><div><p>${after}</p><small><b>${confidence}</b>${evidence}</small></div></article>`;
  }).join("")}<footer><p>“应用”只更新普通编辑草稿，不创建正式卡片。</p>${action(`应用已采用的 ${selected} 项`, "apply-mistake", "primary", selected ? "" : "disabled")}</footer></section></div>`;
}
window.AgentPrototypePageViews = { action, chip, escapeHtml, icon, mistakeDetail, mistakeReview, pageMeta };
})();
