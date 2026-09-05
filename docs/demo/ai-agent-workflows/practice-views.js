(() => {
const { batches, exercises } = window.AgentPrototypeData;
const { action, escapeHtml } = window.AgentPrototypePageViews;
const statusText = { all: "全部", doubt: "有疑问", mastered: "已掌握", unmarked: "未标记" };
function statusPill(status) { return `<span class="learning-state ${status}">${statusText[status]}</span>`; }
function batchList(state) {
  const batch = batches.find((item) => item.id === state.selectedBatchId) || batches[0];
  return `<div class="canvas-head"><div><span class="section-kicker">BATCH LIBRARY</span><h2>一页一个练习批次</h2><p>练习用于强化知识点掌握，不替代考试真题。</p></div><div class="row-actions">${action("按状态复习", "open-status-filter")}${action(state.manageMode ? "退出批量管理" : "批量管理", "toggle-manage")}</div></div><article class="batch-header"><div><span>${escapeHtml(batch.date)}</span><h3>${escapeHtml(batch.title)}</h3><p>${escapeHtml(batch.meta)}</p></div><nav><button type="button" disabled>上一批</button><b>1 / ${batches.length}</b><button type="button" data-action="next-batch">下一批</button></nav></article>${state.manageMode ? manageBar(state, batch) : ""}<div class="exercise-list">${batch.exerciseIds.map((id,index)=>summaryCard(state, exercises.find((item)=>item.id===id), index)).join("")}</div>`;
}
function summaryCard(state, item, index) {
  const checked = state.selectedExercises.includes(item.id);
  return `<button class="exercise-summary ${checked ? "selected" : ""}" type="button" data-exercise-id="${item.id}" data-exercise-index="${index}" ${state.manageMode ? `aria-pressed="${checked}" aria-label="${checked ? "移出选择" : "加入选择"}：第 ${index+1} 题"` : ""}>${state.manageMode ? `<span class="selection-indicator" aria-hidden="true">${checked ? "✓" : "选择"}</span>` : `<span class="exercise-number">${String(index+1).padStart(2,"0")}</span>`}<div><h3>${escapeHtml(item.question)}</h3><p>${item.points.map((point)=>`<span>${escapeHtml(point)}</span>`).join("")}</p></div>${statusPill(item.status)}</button>`;
}
function manageBar(state, batch) {
  return `<div class="manage-bar"><strong>已选择 ${state.selectedExercises.length} 题</strong><button type="button" data-action="select-all">全选本批</button><button type="button" data-action="clear-selection">取消全选</button><span></span>${action("删除选中", "delete-selected", "danger", state.selectedExercises.length ? "" : "disabled")}${action("删除本批", "delete-batch", "danger")}</div>`;
}
function review(state) {
  const item = exercises[state.flipIndex % exercises.length];
  const back = state.flipSide === "back";
  return `<div class="review-toolbar"><div><button type="button" data-action="practice-batches">退出复习</button><button type="button" data-action="previous-exercise" ${state.flipIndex===0?"disabled":""}>上一题</button></div><div><strong>${state.flipIndex+1} / ${exercises.length}</strong>${exercises.map((_,index)=>`<button type="button" data-jump-exercise="${index}" class="${index===state.flipIndex?"active":""}">${index+1}</button>`).join("")}</div><button type="button" data-action="next-exercise">下一题</button></div><article class="flip-card ${back ? "show-back" : ""}" tabindex="0" data-action="flip-card" aria-label="${back ? "答案面" : "题目面"}，按 Enter 或空格翻面"><section class="flip-front"><header><span>题目 ${state.flipIndex+1}</span>${statusPill(item.status)}</header><h2>${escapeHtml(item.question)}</h2><div class="point-row">${item.points.map((point)=>`<span>${escapeHtml(point)}</span>`).join("")}</div><button type="button" data-action="flip-card">查看答案</button></section><section class="flip-back"><header><span>答案与解析</span>${statusPill(item.status)}</header><h3>正确答案</h3><p>${escapeHtml(item.answer)}</p><h3>解析</h3><p>${escapeHtml(item.solution)}</p><div class="training-focus"><strong>训练重点</strong>${item.points.map((point)=>`<span>${escapeHtml(point)}</span>`).join("")}</div><div class="status-controls" data-no-flip><span>标记掌握状态</span><button type="button" data-set-status="doubt" aria-pressed="${item.status === "doubt"}">有疑问</button><button type="button" data-set-status="mastered" aria-pressed="${item.status === "mastered"}">已掌握</button></div><footer data-no-flip><button type="button" data-action="flip-card">返回题目</button><div>${action("手工编辑", "edit-practice", "primary")}</div></footer></section></article>`;
}
function statusFilter(state) {
  const filtered = exercises.filter((item)=>state.filterStatus === "all" || item.status === state.filterStatus);
  return `<div class="filter-hero"><div><span class="section-kicker">GLOBAL REVIEW</span><h2>跨批次按状态筛选</h2><p>批次只保留轻量分隔，练习题本身是视觉主体。</p></div><div class="status-filter">${Object.entries(statusText).map(([key,label])=>`<button type="button" data-status-filter="${key}" aria-pressed="${state.filterStatus===key}">${label}</button>`).join("")}${action("返回批次", "practice-batches")}</div></div><div class="weak-group"><small>今天 · 导数边界与符号表强化</small>${filtered.map((item,index)=>`<button type="button" data-filtered-review="${item.id}"><span>${index+1}</span><p>${escapeHtml(item.question)}</p>${statusPill(item.status)}</button>`).join("") || "<p class='empty-note'>当前筛选下没有练习。</p>"}</div>`;
}
function editor(state) {
  const item = exercises[state.flipIndex];
  return `<form class="editor-sheet"><div class="editor-tabs"><strong>练习卡 ${item.id}</strong><span>保存后维持“${statusText[item.status]}”状态</span></div><label class="body-editor">题目<textarea>${escapeHtml(item.question)}</textarea></label><label class="body-editor">正确答案<textarea>${escapeHtml(item.answer)}</textarea></label><label class="body-editor">解析<textarea>${escapeHtml(item.solution)}</textarea></label><div class="point-manager"><div><strong>关联知识点（至少 1 个）</strong><small>只能选择已有知识点，禁止在练习流程中新建。</small></div><div>${item.points.map((point)=>`<span>${escapeHtml(point)} ×</span>`).join("")}<button type="button">选择已有知识点</button></div></div><div class="editor-foot"><span>本地校验：必填、类型、长度、公式可渲染、ID 与批内精确去重。</span><div class="row-actions">${action("取消并返回", "practice-batches")}${action("保存 revision", "save-practice", "primary")}</div></div></form>`;
}
window.AgentPrototypePracticeViews = { batchList, editor, review, statusFilter };
})();
