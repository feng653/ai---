(() => {
const { knowledgeCards, mistakes } = window.AgentPrototypeData;
const { action, escapeHtml } = window.AgentPrototypePageViews;
function render(state) {
  const knowledgeAllowed = state.pickerKind === "practice";
  if (!knowledgeAllowed) state.pickerTab = "mistakes";
  const list = state.pickerTab === "knowledge" ? knowledgeCards : mistakes;
  const selectable = list.filter((item)=>item.status !== "待补充");
  const selected = state.pickerTab === "knowledge" ? state.selectedSources.knowledge : state.selectedSources.mistakes;
  const preview = list.find((item)=>item.id === state.pickerPreviewId) || list[0];
  const total = state.selectedSources.knowledge.length + state.selectedSources.mistakes.length;
  return `<div class="source-picker"><header><div><span class="section-kicker">EXPLICIT CONTEXT</span><h2>${state.pickerKind === "knowledge" ? "只选择错题作为知识卡依据" : "选择练习所需的具体卡片"}</h2><p>勾选决定加入上下文；点击行只预览，不会选择。</p></div><div class="picker-count"><strong>${total}</strong><span>张已选</span></div></header><div class="picker-tabs">${knowledgeAllowed ? `<button type="button" data-picker-tab="knowledge" aria-pressed="${state.pickerTab === "knowledge"}">知识卡 ${state.selectedSources.knowledge.length}</button>` : ""}<button type="button" data-picker-tab="mistakes" aria-pressed="${state.pickerTab === "mistakes"}">错题 ${state.selectedSources.mistakes.length}</button></div><div class="picker-grid"><section class="source-list">${selectable.map((item)=>`<div class="source-row ${preview.id===item.id?"previewing":""}" data-preview-source="${item.id}"><input type="checkbox" data-select-source="${item.id}" ${selected.includes(item.id)?"checked":""} aria-label="选择 ${escapeHtml(item.title)}"><div><strong>${escapeHtml(item.title)}</strong><small>${item.id} · ${item.updated}</small></div><span>${item.points.length} 个知识点</span></div>`).join("")}</section><article class="source-preview"><span>完整内容预览 · ${preview.id}</span><h3>${escapeHtml(preview.title)}</h3><p>${escapeHtml(preview.body || preview.question)}</p>${preview.answer ? `<h4>我的答案</h4><p>${escapeHtml(preview.answer)}</p><h4>解析</h4><p>${escapeHtml(preview.solution)}</p>` : ""}<div>${preview.points.map((point)=>`<span>${escapeHtml(point)}</span>`).join("")}</div></article></div><footer><p>仅这些卡片的完整内容会提供给 AI；不会扩展到同知识点卡片，也不保存正文快照。</p>${action("确认来源并返回设置", "confirm-sources", "primary", total ? "" : "disabled")}</footer></div>`;
}
window.AgentPrototypeSourcePicker = { render };
})();
