(function startKnowledgeTreeDemo() {
const { buildKnowledgeTree, demoCards, filterCards, filterTree } = globalThis.KnowledgeTreeData;
const { buildKnowledgeCards, buildLearningContext } = globalThis.KnowledgeTreeLearning;

const tree = buildKnowledgeTree(demoCards);
const initialLeaf = flatten(tree).find((node) => node.level === 3);
const state = {
  selection: initialLeaf ? selectionFor(initialLeaf) : null, query: "", view: initialLeaf ? "knowledge" : "cards",
  expanded: new Set(flatten(tree).filter((node) => node.level < 3).map((node) => node.key)),
  revealed: new Set(), mastered: new Set(), questionCount: 3,
};
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[char]);

function selectionFor(node) {
  const [subject, chapter, name] = node.key.split("/");
  return { key: node.key, subject, chapter, name, label: node.label, level: node.level };
}

function pathLabel(selection) {
  if (!selection) return "全部知识点";
  return [selection.subject, selection.chapter, selection.name].filter(Boolean).join(" / ");
}

function flatten(nodes) {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

function treeNode(node) {
  const hasChildren = node.children.length > 0;
  const expanded = state.expanded.has(node.key) || Boolean(state.query);
  const selected = state.selection?.key === node.key;
  return `<li class="tree-node level-${node.level}">
    <div class="tree-row${selected ? " selected" : ""}">
      ${hasChildren ? `<button class="tree-toggle" data-toggle="${escapeHtml(node.key)}" aria-label="${expanded ? "收起" : "展开"}${escapeHtml(node.label)}">
        <span class="chevron${expanded ? " open" : ""}">›</span></button>` : '<span class="tree-spacer"></span>'}
      <button class="tree-label" data-select="${escapeHtml(node.key)}">
        <span class="node-mark"></span><span>${escapeHtml(node.label)}</span><small>${node.count}</small>
      </button>
    </div>
    ${hasChildren && expanded ? `<ul>${node.children.map(treeNode).join("")}</ul>` : ""}
  </li>`;
}

function cardView(card) {
  return `<article class="result-card">
    <header><span>${escapeHtml(card.subject)}</span><em class="${card.status === "已整理" ? "done" : "draft"}">${escapeHtml(card.status)}</em></header>
    <h3>${escapeHtml(card.question)}</h3><p>${escapeHtml(card.diagnosis)}</p>
    <div class="card-points">${card.points.map((point) =>
      `<span>${escapeHtml(point.subject)} <b>›</b> ${escapeHtml(point.chapter)} <b>›</b> ${escapeHtml(point.name)}</span>`).join("")}</div>
    <footer>更新于 ${escapeHtml(card.updatedAt)}<span>学习内容依据</span></footer>
  </article>`;
}

function sourceDetails(context) {
  return `<details class="source-details"><summary>查看本次使用的 ${context.sourceIds.length} 张来源错题</summary>
    <div>${context.sourceLabels.map((label, index) => `<p><span>${index + 1}</span>${escapeHtml(label)}</p>`).join("")}</div></details>`;
}

function knowledgeGridView(knowledgeCards) {
  return `<div class="knowledge-card-grid">${knowledgeCards.map((card) => `<article>
    <header><span>${escapeHtml(card.subject)} / ${escapeHtml(card.chapter)}</span><em>${escapeHtml(card.coverage)}</em></header>
    <h3>${escapeHtml(card.name)}</h3>
    <div><span><b>${card.sourceCount}</b> 道错题</span><span><b>${card.mistakeCount}</b> 个错误样本</span></div>
    <footer><span>一知识点一张卡</span><button data-open-knowledge="${escapeHtml(card.key)}">查看知识卡片 →</button></footer>
  </article>`).join("")}</div>`;
}

function knowledgeDetailView(context) {
  return `<section class="learning-view">
    <header class="learning-head"><span>知</span><div><small>${escapeHtml(context.subject)} / ${escapeHtml(context.chapter)} · 本地知识卡片</small><h3>${escapeHtml(context.tutorial.title)}</h3></div><button data-refresh>更新卡片</button></header>
    <div class="knowledge-evidence"><span><b>${context.sourceIds.length}</b> 道来源错题</span><span><b>${context.misconceptions.length}</b> 个错误样本</span><span><b>${escapeHtml(context.coverage)}</b> 内容状态</span></div>
    <div class="objectives"><strong>掌握目标</strong><div>${context.tutorial.objectives.map((item) => `<span>✓ ${escapeHtml(item)}</span>`).join("")}</div></div>
    <div class="tutorial-sections">${context.tutorial.sections.map((section, index) => `<article><em>${String(index + 1).padStart(2, "0")}</em><div><h4>${escapeHtml(section.title)}</h4><p>${escapeHtml(section.content)}</p></div></article>`).join("")}</div>
    <section class="mistake-patterns"><header><h4>这组错题暴露的错误模式</h4><span>${context.misconceptions.length} 条</span></header>
      ${context.misconceptions.map((item, index) => `<article><b>${index + 1}</b><div><strong>${escapeHtml(item.diagnosis)}</strong><p>${escapeHtml(item.question)}</p></div></article>`).join("")}</section>
    ${sourceDetails(context)}
  </section>`;
}

function reviewView(context) {
  const questions = context.questions.slice(0, state.questionCount);
  const completed = questions.filter((question) => state.mastered.has(question.id)).length;
  return `<section class="learning-view">
    <header class="learning-head"><span>?</span><div><small>基于当前知识点生成 · ${completed}/${questions.length} 已掌握</small><h3>${escapeHtml(context.topic)} · 复习题</h3></div><label class="review-count">每次生成 <select data-review-count>${[1, 2, 3, 4, 5].map((count) => `<option value="${count}"${count === state.questionCount ? " selected" : ""}>${count} 题</option>`).join("")}</select></label><button data-refresh>换一组</button></header>
    <div class="review-plan"><span><b>1</b> 变式迁移</span><span><b>${Math.min(2, context.sourceIds.length)}</b> 原题复练</span><span><b>1</b> 错因归纳</span></div>
    <div class="review-progress"><i style="width:${completed / questions.length * 100}%"></i></div>
    <div class="questions">${questions.map((question, index) => {
      const revealed = state.revealed.has(question.id);
      const mastered = state.mastered.has(question.id);
      return `<article class="${mastered ? "mastered" : ""}"><header><span>第 ${index + 1} 题</span><em>${escapeHtml(question.kind)}</em><small>${question.sourceIds.length} 个来源</small></header>
        <h4>${escapeHtml(question.prompt)}</h4><div class="question-actions"><button data-action="reveal" data-id="${question.id}">${revealed ? "收起答案" : "查看答案"}</button><button class="${mastered ? "done" : ""}" data-action="master" data-id="${question.id}">✓ ${mastered ? "已掌握" : "标记掌握"}</button></div>
        ${revealed ? `<div class="answer"><strong>答案</strong><p>${escapeHtml(question.answer)}</p><strong>解析</strong><p>${escapeHtml(question.explanation)}</p></div>` : ""}</article>`;
    }).join("")}</div>${sourceDetails(context)}
  </section>`;
}

function renderContent(cards, knowledgeCards) {
  if (state.view === "cards") return cards.length
    ? `<div class="result-grid">${cards.map(cardView).join("")}</div>`
    : '<div class="result-empty"><strong>没有匹配的错题</strong><span>可以清除分类后查看全部内容</span></div>';
  if (state.view === "knowledge") {
    const context = buildLearningContext(demoCards, state.selection);
    return context ? knowledgeDetailView(context) : knowledgeGridView(knowledgeCards);
  }
  const context = buildLearningContext(demoCards, state.selection);
  return context ? reviewView(context) : '<div class="result-empty"><strong>请选择具体知识点</strong><span>复习题需要明确到树的第三级</span></div>';
}

function render() {
  const visibleTree = filterTree(tree, state.query);
  const cards = filterCards(demoCards, state.selection);
  const knowledgeCards = buildKnowledgeCards(demoCards, state.selection);
  $("knowledgeTree").innerHTML = visibleTree.length ? visibleTree.map(treeNode).join("") : '<li class="tree-empty">没有匹配的知识点</li>';
  $("activePath").textContent = pathLabel(state.selection);
  $("resultTitle").textContent = state.selection ? state.selection.label : "全部错题";
  $("resultMeta").textContent = `${cards.length} 道错题 · ${knowledgeCards.length} 张知识卡片`;
  $("cardTabCount").textContent = cards.length;
  $("knowledgeTabCount").textContent = knowledgeCards.length;
  $("clearFilter").hidden = !state.selection;
  const learningReady = state.selection?.level === 3;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
    button.disabled = button.dataset.view === "review" && !learningReady;
  });
  $("viewHint").textContent = learningReady ? `${cards.length} 道错题共同更新这张知识卡片` : `当前范围包含 ${knowledgeCards.length} 张知识卡片`;
  $("viewContent").innerHTML = renderContent(cards, knowledgeCards);
}

$("treeSearch").addEventListener("input", (event) => { state.query = event.target.value; render(); });
$("knowledgeTree").addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-toggle]");
  if (toggle) { const key = toggle.dataset.toggle; state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key); render(); return; }
  const select = event.target.closest("[data-select]");
  if (!select) return;
  const node = flatten(tree).find((item) => item.key === select.dataset.select);
  if (!node) return;
  state.selection = state.selection?.key === node.key ? null : selectionFor(node);
  if (node.children.length) state.expanded.add(node.key);
  if (state.selection?.level !== 3 && state.view === "review") state.view = "knowledge";
  state.revealed.clear(); state.mastered.clear(); render();
});
$("clearFilter").addEventListener("click", () => { state.selection = null; if (state.view === "review") state.view = "knowledge"; render(); });
document.querySelector(".view-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button || button.disabled) return;
  state.view = button.dataset.view; render();
});
$("viewContent").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.openKnowledge) {
    const node = flatten(tree).find((item) => item.key === button.dataset.openKnowledge);
    if (node) { state.selection = selectionFor(node); state.view = "knowledge"; state.revealed.clear(); state.mastered.clear(); render(); }
    return;
  }
  if (button.hasAttribute("data-refresh")) { button.textContent = "已按当前错题重新生成"; return; }
  const set = button.dataset.action === "reveal" ? state.revealed : state.mastered;
  if (!button.dataset.id || !set) return;
  set.has(button.dataset.id) ? set.delete(button.dataset.id) : set.add(button.dataset.id);
  render();
});
$("viewContent").addEventListener("change", (event) => {
  if (!event.target.matches("[data-review-count]")) return;
  state.questionCount = Number(event.target.value); state.revealed.clear(); state.mastered.clear(); render();
});
render();
})();
