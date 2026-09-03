const pageTargets = [...document.querySelectorAll("[data-page-target]")];
const pages = [...document.querySelectorAll("[data-page-view]")];
const treeNodes = [...document.querySelectorAll(".tree-node")];
const cards = [...document.querySelectorAll(".knowledge-card")];
const providerRows = [...document.querySelectorAll(".provider-row")];
const providerCopy = {
  codex: ["Codex", "已通过本机 Codex CLI 安全连接"],
  deepseek: ["DeepSeek", "输入 API Key 后即可连接 DeepSeek 模型"],
  custom: ["自定义供应商", "配置兼容 OpenAI API 的服务地址"],
};

function setPage(page) {
  document.body.dataset.page = page;
  pageTargets.forEach((item) => item.classList.toggle("active", item.dataset.pageTarget === page));
  pages.forEach((item) => item.classList.toggle("active", item.dataset.pageView === page));
  if (globalThis.history?.replaceState) history.replaceState(null, "", `#${page}`);
}

function toggleSidebar() {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  const button = document.querySelector("#sidebarToggle");
  button.textContent = collapsed ? "›" : "‹";
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", collapsed ? "展开侧栏" : "收起侧栏");
}

function toggleFocusMode(force) {
  const focused = typeof force === "boolean"
    ? document.body.classList.toggle("focus-mode", force)
    : document.body.classList.toggle("focus-mode");
  const button = document.querySelector("#focusToggle");
  if (button) button.textContent = focused ? "显示预览" : "专注模式";
}

function selectTreeNode(node) {
  treeNodes.forEach((item) => item.classList.toggle("active", item === node));
  document.querySelector("#breadcrumb").textContent = node.dataset.path;
  document.querySelector("#pageTitle").textContent = node.dataset.path.split(" / ").at(-1);
  document.querySelector("#resultCount").textContent = node.dataset.count;
}

function selectCard(card) {
  cards.forEach((item) => item.classList.toggle("selected", item === card));
  document.querySelector("#previewTitle").textContent = card.dataset.title;
  document.querySelector("#previewMeta").textContent = card.dataset.meta;
}

function selectProvider(row) {
  providerRows.forEach((item) => item.classList.toggle("active", item === row));
  const [name, summary] = providerCopy[row.dataset.provider];
  document.querySelector("#providerName").textContent = name;
  document.querySelector("#providerSummary").textContent = summary;
}

function selectChoice(choice) {
  document.querySelectorAll("[data-choice]").forEach((item) => item.classList.toggle("selected", item === choice));
}

function advanceQuestion() {
  document.querySelector("#questionNumber").textContent = "第 4 题，共 8 题";
  document.querySelector("#practiceProgress").style.width = "50%";
  const map = [...document.querySelectorAll(".question-map button")];
  map[2]?.classList.replace("current", "done");
  map[3]?.classList.add("current");
}

pageTargets.forEach((item) => item.addEventListener("click", () => setPage(item.dataset.pageTarget)));
treeNodes.forEach((node) => node.addEventListener("click", () => selectTreeNode(node)));
cards.forEach((card) => card.addEventListener("click", () => selectCard(card)));
providerRows.forEach((row) => row.addEventListener("click", () => selectProvider(row)));
document.querySelectorAll("[data-choice]").forEach((choice) => choice.addEventListener("click", () => selectChoice(choice)));
document.querySelector("#sidebarToggle")?.addEventListener("click", toggleSidebar);
document.querySelector("#focusToggle")?.addEventListener("click", () => toggleFocusMode());
document.querySelector(".inspector>header button")?.addEventListener("click", () => toggleFocusMode(true));
document.querySelector("#explanationToggle")?.addEventListener("click", () => document.body.classList.toggle("hint-visible"));
document.querySelector("#nextQuestion")?.addEventListener("click", advanceQuestion);

const initialPage = location.hash.slice(1);
setPage(["library", "practice", "settings"].includes(initialPage) ? initialPage : "library");
