import { $, $$, closeLayer } from "./ui.js";
import { setupLibrary, applyTreeFilter, setSurfaceState } from "./library.js";
import { openCardDetail, closeCardDetail } from "./card-detail.js";
import { setupEditor } from "./editor.js";
import { setupSettings } from "./settings.js";
import { setupAgent } from "./agent.js";

const pageCopy = {
  library: ["学习工作台", "错题与知识"],
  editor: ["卡片编辑器", "整理一道错题"],
  settings: ["设置", "AI 接入"]
};

let agentApi;
const validPages = new Set(Object.keys(pageCopy));
const openCard = (id, source) => openCardDetail(id, source, navigate);

function navigate(page, updateHash = true) {
  const target = validPages.has(page) ? page : "library";
  document.body.dataset.page = target;
  $$("[data-page-view]").forEach((view) => view.classList.toggle("active", view.dataset.pageView === target));
  $$(".primary-nav [data-page-target]").forEach((button) => button.classList.toggle("active", button.dataset.pageTarget === target));
  $("#pageEyebrow").textContent = pageCopy[target][0];
  $("#pageContext").textContent = pageCopy[target][1];
  if (updateHash && location.hash !== `#${target}`) history.pushState(null, "", `#${target}`);
  if (!updateHash && target !== page) history.replaceState(null, "", "#library");
  document.body.classList.remove("mobile-nav-open");
}

function toggleSidebar() {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  const button = $("#sidebarToggle");
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", collapsed ? "展开侧栏" : "收起侧栏");
  button.setAttribute("title", collapsed ? "展开侧栏" : "收起侧栏");
  $("#sidebarToggle span").textContent = collapsed ? "展开侧栏" : "收起侧栏";
  localStorage.setItem("zhishi:demo-sidebar-collapsed", String(collapsed));
}

function positionPopover(popover, anchor, placement = "bottom") {
  const rect = anchor.getBoundingClientRect();
  popover.hidden = false;
  popover.style.left = `${Math.max(10, Math.min(innerWidth - popover.offsetWidth - 10, rect.left))}px`;
  popover.style.top = placement === "bottom" ? `${rect.bottom + 8}px` : `${Math.max(10, rect.top - popover.offsetHeight - 8)}px`;
}

function closePopovers(event) {
  if (event?.target.closest(".popover, #stateMenuButton")) return;
  $("#stateMenu").hidden = true;
}

function setupShell() {
  const storedCollapsed = localStorage.getItem("zhishi:demo-sidebar-collapsed") === "true";
  if (storedCollapsed) document.body.classList.add("sidebar-collapsed");
  $("#sidebarToggle").addEventListener("click", toggleSidebar);
  $("#brandButton").addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-collapsed")) { toggleSidebar(); return; }
    navigate("library");
  });
  $$("[data-page-target]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.pageTarget)));
  $("#mobileBrand").addEventListener("click", () => {
    if (document.body.dataset.page !== "library") navigate("library");
    else document.body.classList.toggle("mobile-nav-open");
  });
  $("#stateMenuButton").addEventListener("click", () => positionPopover($("#stateMenu"), $("#stateMenuButton")));
  $$("[data-surface-state]").forEach((button) => button.addEventListener("click", () => {
    navigate("library");
    const state = button.dataset.surfaceState;
    setSurfaceState(state);
    $("#stateMenu").hidden = true;
  }));
  document.addEventListener("click", closePopovers);
}

function setupTree() {
  $$(".tree-node").forEach((node) => node.addEventListener("click", () => {
    const branch = node.nextElementSibling?.classList.contains("tree-branch") ? node.nextElementSibling : null;
    if (branch) {
      const open = branch.classList.toggle("open");
      const toggle = $(".branch-toggle", node);
      if (toggle) toggle.textContent = open ? "−" : "+";
    }
    $$(".tree-node").forEach((item) => item.classList.remove("active"));
    node.classList.add("active");
    const leaf = node.classList.contains("leaf");
    applyTreeFilter(node.dataset.filter, leaf, openCard);
  }));
  $("#clearFilter").addEventListener("click", () => {
    const root = $(".tree-node.root");
    $$(".tree-node").forEach((item) => item.classList.remove("active"));
    root.classList.add("active");
    applyTreeFilter("全部知识", false, openCard);
    $("#treeSearch").value = "";
    $$(".tree-node").forEach((item) => { item.hidden = false; });
  });
  $("#treeSearch").addEventListener("input", (event) => {
    const query = event.target.value.trim();
    let matches = 0;
    $$(".tree-node").forEach((node) => {
      const visible = !query || node.textContent.includes(query) || node.classList.contains("root");
      node.hidden = !visible;
      if (visible && !node.classList.contains("root")) matches += 1;
    });
    if (query) $$(".tree-branch").forEach((branch) => branch.classList.add("open"));
    $("#treeCount").textContent = query ? String(matches) : "12";
  });
}

function setupKeyboard() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    $("#stateMenu").hidden = true;
    document.body.classList.remove("mobile-nav-open");
    if (!$("#cardDetailLayer").hidden) closeCardDetail();
    if (!$("#imageDialog").hidden) closeLayer($("#imageDialog"));
    if (!$("#confirmDialog").hidden) closeLayer($("#confirmDialog"));
    if (!$("#agentWindow").hidden) agentApi.closeAgent();
  });
}

setupShell();
setupTree();
setupLibrary(openCard);
setupEditor(navigate);
setupSettings();
agentApi = setupAgent();
setupKeyboard();

window.addEventListener("hashchange", () => navigate(location.hash.slice(1), false));
navigate(location.hash.slice(1) || "library", false);
$$("svg").forEach((svg) => svg.setAttribute("aria-hidden", "true"));

const preview = new URLSearchParams(location.search).get("preview");
if (preview === "agent") $("#agentLauncher").click();
if (preview === "card") $(".study-card")?.click();
if (preview === "collapsed" && !document.body.classList.contains("sidebar-collapsed")) $("#sidebarToggle").click();
if (preview === "review") $("[data-library-target=\"review\"]").click();
if (preview === "review-saved") { $("[data-library-target=\"review\"]").click(); $("#generatePractice").click(); }
if (preview === "custom-api") { navigate("settings"); $("#addProvider").click(); }
if (preview === "editor-tree") { navigate("editor"); $("#knowledgePicker").scrollIntoView({ block: "center" }); }
