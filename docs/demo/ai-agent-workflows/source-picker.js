(() => {
const { knowledgeCards, mistakes } = window.AgentPrototypeData;
const { action, escapeHtml } = window.AgentPrototypePageViews;
function render(state) {
  const knowledgeAllowed = state.pickerKind === "practice";
  if (!knowledgeAllowed) state.pickerTab = "mistakes";
  const list = state.pickerTab === "knowledge" ? knowledgeCards : mistakes;
  const selectable = list.filter((item)=>item.status !== "待补充");
  const draft = state.pickerDraft || state.selectedSources;
  const selected = state.pickerTab === "knowledge" ? draft.knowledge : draft.mistakes;
  const preview = list.find((item)=>item.id === state.pickerPreviewId) || list[0];
  const total = draft.knowledge.length + draft.mistakes.length;
  return `<div class="source-picker"><header><div><span class="section-kicker">EXPLICIT CONTEXT</span><h2>${state.pickerKind === "knowledge" ? "只选择错题作为知识卡依据" : "选择练习所需的具体卡片"}</h2><p>点击“加入任务”改变本次草稿；点击卡片内容只预览。</p></div><div class="picker-count" role="status" aria-atomic="true"><strong>${total}</strong><span>张已加入任务草稿</span></div></header><div class="picker-tabs">${knowledgeAllowed ? `<button type="button" data-picker-tab="knowledge" aria-pressed="${state.pickerTab === "knowledge"}">知识卡 ${draft.knowledge.length}</button>` : ""}<button type="button" data-picker-tab="mistakes" aria-pressed="${state.pickerTab === "mistakes"}">错题 ${draft.mistakes.length}</button></div><div class="picker-grid"><section class="source-list">${selectable.map((item)=>{const included=selected.includes(item.id);return `<div class="source-row ${preview.id===item.id?"previewing":""} ${included?"selected":""}" data-preview-source="${item.id}"><div><strong>${escapeHtml(item.title)}</strong><small>${item.id} · ${item.updated} · ${item.points.length} 个知识点</small></div><button class="source-select-toggle" type="button" data-select-source="${item.id}" aria-pressed="${included}" aria-label="${included?"从任务移除":"加入任务"}：${escapeHtml(item.title)}">${included?"移出任务":"加入任务"}</button></div>`;}).join("")}</section><article class="source-preview"><span>完整内容预览 · ${preview.id}</span><h3>${escapeHtml(preview.title)}</h3><p>${escapeHtml(preview.body || preview.question)}</p>${preview.answer ? `<h4>我的答案</h4><p>${escapeHtml(preview.answer)}</p><h4>解析</h4><p>${escapeHtml(preview.solution)}</p>` : ""}<div>${preview.points.map((point)=>`<span>${escapeHtml(point)}</span>`).join("")}</div></article></div><footer><p>取消会丢弃本页改动；确认后才把明确加入的卡片交给任务。</p><div>${action("取消", "cancel-sources")}${action("确认来源", "confirm-sources", "primary", total ? "" : "disabled")}</div></footer></div>`;
}
window.AgentPrototypeSourcePicker = { render };
})();
