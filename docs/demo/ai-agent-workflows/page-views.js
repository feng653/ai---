(() => {
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function chip(text) { return `<span class="context-chip">${escapeHtml(text)}</span>`; }
function action(label, name, kind = "secondary", extra = "") {
  return `<button class="button ${kind}" type="button" data-action="${name}" ${extra}>${label}</button>`;
}
function pageMeta(state) {
  if (state.view === "source-picker") return ["AI 任务 / 明确选择上下文", "选择生成依据", "返回设置", "close-picker", "已选择具体卡片", ["不会自动带入同知识点卡片", "正文仅用于本次上下文"]];
  if (state.view === "knowledge-review") return ["知识卡片 / Agent 提案", "逐卡审核", "返回知识卡", "knowledge-list", "3 张独立提案", ["一次只审核一张", "原卡保留"]];
  if (state.view === "knowledge-editor") return ["知识卡片 / 编辑", state.selectedCardId === "new" ? "新增知识卡" : "编辑知识卡", "取消编辑", "knowledge-detail", "本地草稿自动保存", ["显式保存创建 revision", "正文支持 Markdown / 公式"]];
  if (state.view === "knowledge-detail") return ["知识卡片 / 详情", "知识卡详情", "返回列表", "knowledge-list", "当前卡片", ["组织关系不是 AI 上下文", "revision 4"]];
  if (state.view === "practice-review") return ["练习题库 / 批次复习", "翻面练习", "退出复习", "practice-batches", `${state.flipIndex + 1} / 4`, ["状态即时保存", "固定顺序"]];
  if (state.view === "practice-filter") return ["练习题库 / 全部批次", "按掌握状态复习", "返回批次", "practice-batches", "跨批次筛选", ["弱化批次分组", "点击开始序列"]];
  if (state.view === "practice-edit") return ["练习题库 / 编辑", "编辑练习卡", "返回练习", "practice-review", "手工编辑", ["仅可选择已有知识点", "状态保持不变"]];
  if (state.view === "mistake-review") return ["错题库 / Agent 建议", "逐字段比较", "返回错题", "mistake-detail", "建议尚未写入", ["应用后进入编辑草稿", "最终保存才创建 revision"]];
  const meta = {
    knowledge: ["知识卡片 / 最近修改", "知识卡片", "生成知识卡", "open-knowledge-config", "5 张独立卡片", ["双列摘要", "自由正文"]],
    mistakes: ["错题库 / 导数与函数性质", "错题详情", "让 Agent 整理", "open-mistake-config", "错题 E-104", ["revision 7", "手工编辑可用"]],
    practice: ["练习题库 / 按批次", "练习题库", "生成练习", "open-practice-config", "2 个批次", ["共 12 题", "可批量管理"]],
  }[state.page];
  return meta;
}
function mistakeDetail() {
  return `<div class="canvas-head"><div><span class="section-kicker">MISTAKE · E-104</span><h2>函数单调性的第一处错误</h2><p>Agent 只提出字段建议，页面承担比较、选择和最终保存。</p></div></div>
  <div class="mistake-layout"><article class="surface-card problem-card"><div class="card-topline"><span class="subject-tag">数学</span><span class="soft-tag">导数与单调性</span><time>今天</time></div><h3>已知函数 f(x)=x³−3x，求函数的单调区间。</h3><div class="equation">f′(x) = 3x² − 3</div><p>我的答案：在 (−∞,−1) 和 (1,+∞) 上递增。</p></article><aside class="detail-list"><div class="detail-row"><span>正确答案</span><p>另有 (−1,1) 上递减。</p></div><div class="detail-row incomplete"><span>第一处错误</span><p>尚未整理</p></div><div class="detail-row incomplete"><span>错误原因</span><p>尚未整理</p></div></aside></div>`;
}
function mistakeReview() {
  const rows = [["第一处错误","尚未整理","只写出导数为正的区间，遗漏递减区间。"],["错误原因","尚未整理","把“求单调区间”缩减成“求递增区间”。"],["改进动作","无","按临界点画完整符号表，再反查定义域。"]];
  return `<div class="review-head"><div><span class="section-kicker">FIELD PROPOSAL · P-104</span><h2>选择要采用的建议</h2><p>勾选只决定哪些建议进入普通编辑草稿，不会直接写入。</p></div>${action("应用选中建议", "apply-mistake", "primary")}</div><div class="field-compare"><div class="compare-labels"><span>字段</span><span>当前内容</span><span>Agent 建议</span></div>${rows.map(([field,oldValue,newValue],index)=>`<label class="compare-row"><span><input type="checkbox" ${index < 2 ? "checked" : ""}>${field}</span><p>${oldValue}</p><p>${newValue}</p></label>`).join("")}</div>`;
}
window.AgentPrototypePageViews = { action, chip, escapeHtml, icon, mistakeDetail, mistakeReview, pageMeta };
})();
