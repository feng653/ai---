import { cards } from "./data.js";
import { $, $$, icon, toast } from "./ui.js";
import { reviewMarkup, bindReview } from "./review-builder.js";

let activeFilter = "全部知识";
let specificKnowledge = false;

function cardMarkup(card, index) {
  return `<article class="study-card" role="button" tabindex="0" data-card-id="${card.id}" style="--card-wash:${card.wash};animation-delay:${index * 45}ms">
    <div class="card-meta"><span class="status-chip ${card.status === "待完善" ? "warn" : ""}">${card.status}</span><time>${card.updated}</time></div>
    <h2>${card.title}</h2><p>${card.summary}</p>
    <div class="card-tags">${card.tags.map((tag) => `<span>${tag}</span>`).join("")}</div><span class="card-type">${card.subject} · ${card.type}</span>
  </article>`;
}

export function renderCards(query = "") {
  const normalized = query.trim().toLowerCase();
  const filtered = cards.filter((card) => {
    const inTree = activeFilter === "全部知识" || card.subject === activeFilter || card.tags.includes(activeFilter);
    const text = `${card.title}${card.summary}${card.tags.join("")}`.toLowerCase();
    return inTree && (!normalized || text.includes(normalized));
  });
  $("#cardGrid").innerHTML = filtered.map(cardMarkup).join("");
  $("#resultCount").textContent = String(activeFilter === "全部知识" && !normalized ? 12 : filtered.length);
  if (!filtered.length) setSurfaceState("empty", "没有匹配结果", "换一个关键词，或清除知识树筛选。", true);
  return filtered;
}

function knowledgeMarkup() {
  if (!specificKnowledge) return `<div class="surface-state" style="display:grid"><div class="state-box">${icon("book")}<strong>选择一个具体知识点</strong><p>知识卡片需要真实来源证据。请在左侧选择“函数与导数”等叶子节点。</p></div></div>`;
  return `<div class="knowledge-layout"><article class="knowledge-main">
    <div class="knowledge-top"><div><span class="section-kicker">EVIDENCE-BASED NOTE</span><h2>${activeFilter}</h2><p>由 4 道来源错题即时归纳 · revision 已匹配</p></div><div class="coverage"><b>72%</b><span>内容覆盖度</span><span class="coverage-track"><i></i></span></div></div>
    <section class="knowledge-block"><h3>核心方法</h3><p>先找出临界点，再按定义域分段判断符号。结论必须覆盖所有区间，并在端点处说明函数的连续性。</p></section>
    <section class="knowledge-block"><h3>高频易错</h3><p>只列导数为正的区间；临界点重复归入两个区间；忽略题目定义域造成无效结论。</p></section>
    <section class="knowledge-block"><h3>AI 生成状态</h3><p id="knowledgeAiCopy">当前为来源证据归纳，尚未生成扩展讲解。</p><button class="button quiet" id="generateKnowledge" type="button">AI 生成讲解</button></section>
  </article><aside class="knowledge-aside"><div class="aside-heading"><strong>来源证据</strong><span class="status-chip">4 道</span></div><div class="source-list">${cards.slice(0,4).map((card) => `<button class="source-card" type="button" data-card-id="${card.id}"><b>${card.title}</b><small>${card.type} · ${card.updated}</small></button>`).join("")}</div></aside></div>`;
}

function bindDynamic(openCard) {
  $$("[data-card-id]").forEach((item) => {
    const open = () => openCard(item.dataset.cardId, item);
    item.addEventListener("click", open);
    item.addEventListener("keydown", (event) => { if (event.key === "Enter") open(); });
  });
  $("#generateKnowledge")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "正在核对来源…";
    await new Promise((resolve) => setTimeout(resolve, 900));
    $("#knowledgeAiCopy").textContent = "已生成扩展讲解；若任一来源 revision 变化，本段将立即标记失效。";
    event.currentTarget.textContent = "重新生成";
    event.currentTarget.disabled = false;
    toast("知识讲解已生成（UI 模拟）");
  });
}

function renderReview() {
  $("#reviewView").innerHTML = reviewMarkup();
  bindReview(renderReview);
}

export function setLibraryView(view, openCard) {
  document.body.dataset.libraryView = view;
  $$("[data-library-target]").forEach((button) => button.classList.toggle("active", button.dataset.libraryTarget === view));
  $$("[data-library-view]").forEach((panel) => panel.classList.toggle("active", panel.dataset.libraryView === view));
  if (view === "knowledge") $("#knowledgeView").innerHTML = knowledgeMarkup();
  if (view === "review") renderReview();
  bindDynamic(openCard);
}

export function applyTreeFilter(filter, isLeaf, openCard) {
  activeFilter = filter;
  specificKnowledge = isLeaf;
  renderCards($("#cardSearch").value);
  if (document.body.dataset.libraryView !== "cards") setLibraryView(document.body.dataset.libraryView, openCard);
}

export function setSurfaceState(state, title, description, preserveGrid = false) {
  const grid = $("#cardGrid");
  const surface = $("#surfaceState");
  if (state === "normal") { surface.hidden = true; grid.hidden = false; renderCards($("#cardSearch").value); return; }
  grid.hidden = !preserveGrid;
  if (preserveGrid) grid.innerHTML = "";
  surface.hidden = false;
  if (state === "loading") surface.innerHTML = `<div class="skeleton-grid">${"<div class=\"skeleton\"></div>".repeat(3)}</div>`;
  else surface.innerHTML = `<div class="state-box">${icon(state === "error" ? "warning" : "book")}<strong>${title ?? (state === "error" ? "暂时无法读取卡片" : "还没有错题卡")}</strong><p>${description ?? (state === "error" ? "检查本地数据后重试，已有内容不会被覆盖。" : "新增第一道错题，开始建立你的知识脉络。")}</p></div>`;
}

export function setupLibrary(openCard) {
  renderCards();
  setLibraryView("cards", openCard);
  $$("[data-library-target]").forEach((button) => button.addEventListener("click", () => setLibraryView(button.dataset.libraryTarget, openCard)));
  $("#cardSearch").addEventListener("input", (event) => renderCards(event.target.value));
  bindDynamic(openCard);
}
