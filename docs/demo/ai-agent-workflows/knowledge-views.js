(() => {
const { knowledgeCards } = window.AgentPrototypeData;
const { action, escapeHtml } = window.AgentPrototypePageViews;
function selected(value, current) { return value === current ? "selected" : ""; }
function pointChips(points) {
  const visible = points.slice(0, 2).map((point) => `<span>${escapeHtml(point)}</span>`).join("");
  return visible + (points.length > 2 ? `<span>+${points.length - 2}</span>` : "");
}
function list(state) {
  const filters = state.knowledgeFilters;
  const cards = knowledgeCards.filter((card) => {
    const textMatch = `${card.title} ${card.body}`.toLowerCase().includes(filters.text.toLowerCase());
    const pointMatch = filters.point === "all" || card.points.some((point) => point.includes(filters.point));
    const typeMatch = filters.type === "all" || card.type.includes(filters.type);
    return textMatch && pointMatch && typeMatch;
  });
  return `<div class="canvas-head"><div><span class="section-kicker">RECENTLY UPDATED</span><h2>每张卡都是独立知识记录</h2><p>知识点只用于组织；不会把同一知识点下的其他卡片自动交给 AI。</p></div><div class="row-actions">${action("新增知识卡", "new-knowledge")}</div></div>
  <div class="filter-bar"><label>搜索<input data-knowledge-filter="text" value="${escapeHtml(filters.text)}" placeholder="标题或正文"></label><label>知识树<select data-knowledge-filter="point"><option value="all">全部知识点</option><option value="导数" ${selected("导数",filters.point)}>高等数学 / 导数</option><option value="极值" ${selected("极值",filters.point)}>高等数学 / 极值</option></select></label><label>类型<select data-knowledge-filter="type"><option value="all">全部类型</option><option value="易错细节" ${selected("易错细节",filters.type)}>易错细节</option><option value="判断清单" ${selected("判断清单",filters.type)}>判断清单</option></select></label><span>按最近修改排序 · ${cards.length} 张</span></div>
  <div class="knowledge-summary-grid">${cards.map(summary).join("") || "<p class='empty-note'>没有符合当前筛选的知识卡。</p>"}</div>`;
}
function summary(card) {
  const preview = card.body || "正文为空，可先保存为待补充；待补充卡不能作为练习来源。";
  return `<button class="knowledge-summary" type="button" data-open-knowledge="${card.id}"><header><span class="type-chip">${escapeHtml(card.type)}</span><time>${card.updated}</time></header><h3>${escapeHtml(card.title)}</h3><p class="three-line">${escapeHtml(preview)}</p><footer><div>${pointChips(card.points)}</div><b class="${card.status === "待补充" ? "waiting" : ""}">${card.status}</b></footer></button>`;
}
function detail(id) {
  const card = knowledgeCards.find((item) => item.id === id) || knowledgeCards[0];
  const points = card.points.map((point) => `<span>${escapeHtml(point)}</span>`).join("");
  const body = card.body ? `<p>${escapeHtml(card.body)}</p><h3>复查动作</h3><ul><li>先写完整定义域。</li><li>以临界点切分，再逐段判断。</li><li>用区间并集反查遗漏。</li></ul>` : "<p class='empty-note'>正文待补充</p>";
  return `<article class="knowledge-detail"><header><div><span class="type-chip">${escapeHtml(card.type)}</span><span class="revision">revision 4 · ${card.updated}</span></div><div class="row-actions">${action("生成练习", "practice-from-card")}${action("交给 Agent", "agent-edit-knowledge")}${action("编辑", "edit-knowledge", "primary")}</div></header><h2>${escapeHtml(card.title)}</h2><div class="point-row"><strong>关联知识点</strong>${points}</div><div class="markdown-body">${body}</div><footer><span>关联 ${card.points.length} 个知识点 · 组织关系不等于 AI 上下文</span>${action("删除此卡", "delete-knowledge", "danger")}</footer></article>`;
}
function editor(id) {
  const card = knowledgeCards.find((item) => item.id === id);
  const points = (card?.points || []).map((point) => `<span>${escapeHtml(point)} ×</span>`).join("");
  return `<form class="editor-sheet"><div class="editor-top"><label>标题 <input value="${escapeHtml(card?.title || "")}" required placeholder="必填"></label><label>类型（可选）<select><option>${escapeHtml(card?.type || "未分类")}</option><option>概念</option><option>方法</option><option>易错细节</option><option>+ 新建自定义类型</option></select></label></div><div class="point-manager"><div><strong>关联知识点</strong><small>可多选、移除；手工编辑知识卡时可新建知识点。</small></div><div>${points}<button type="button" data-action="manage-points">管理知识点</button></div></div><div class="editor-tabs"><button class="active" type="button">编辑</button><button type="button" data-action="preview-editor">预览</button><span>草稿已自动保存</span></div><label class="body-editor">正文（可留空）<textarea placeholder="支持 Markdown 与公式">${escapeHtml(card?.body || "")}</textarea></label><div class="editor-foot"><span>正文为空时保存为“待补充”，不能用于生成练习。</span>${action("保存并创建 revision", "save-knowledge", "primary")}</div></form>`;
}
function review(state) {
  const cards = [["易错细节","导数符号表要覆盖全部区间"],["判断清单","边界点与单调区间端点"],["复盘动作","从定义域反查遗漏区间"]];
  const [type,title] = cards[state.proposalIndex];
  const nav = cards.map((card,index) => `<button type="button" data-proposal-index="${index}" class="${index === state.proposalIndex ? "active" : ""}"><span>${index+1}</span><div><strong>${card[1]}</strong><small>${state.proposalStates[index] === "saved" ? "已保存" : state.proposalStates[index] === "rejected" ? "已拒绝" : "待审核"}</small></div></button>`).join("");
  return `<div class="proposal-layout"><nav class="proposal-nav" aria-label="提案导航">${nav}</nav><article class="proposal-editor"><header><span>提案 ${state.proposalIndex+1} / ${cards.length}</span><b>Agent 自动拆分：每张卡只承载一个可复习判断</b></header><label>标题<input value="${title}"></label><label>类型<select><option>${type}</option><option>概念</option><option>方法</option></select></label><div class="point-manager"><div><strong>已有知识点</strong><small>此处不可隐式创建新点。</small></div><div><span>导数与单调性 ×</span><button type="button" data-action="manage-points">选择已有知识点</button></div></div><label class="body-editor">正文<textarea>以临界点切分定义域，逐段判断导数符号；完成后反查所有连续区间是否覆盖。</textarea></label><footer><span>修改后保存的是当前编辑版本；要求 Agent 重写会使本提案失效。</span><div>${action("拒绝", "reject-proposal", "danger")}${action("让 Agent 重写", "rewrite-proposal")}${action("保存并看下一张", "save-proposal", "primary")}</div></footer></article></div>`;
}
window.AgentPrototypeKnowledgeViews = { detail, editor, list, review };
})();
