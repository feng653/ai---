import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(resolve("docs/demo/knowledge-workspace-redesign/index.html"), "utf8");

function mountDemo(hash = "#library") {
  history.replaceState(null, "", hash);
  document.open();
  document.write(html);
  document.close();
  localStorage.clear();
}

async function loadDemo() {
  await import("./app.js");
}

describe("knowledge workspace redesign demo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    Element.prototype.animate = vi.fn(() => ({ finished: Promise.resolve() }));
    mountDemo();
  });

  it("navigates every primary workspace and avoids triangle affordances", async () => {
    await loadDemo();
    document.querySelector('[data-page-target="settings"]').click();
    expect(document.body.dataset.page).toBe("settings");
    expect(document.querySelector('[data-page-view="settings"]').classList.contains("active")).toBe(true);
    document.querySelector('[data-page-target="editor"]').click();
    expect(document.body.dataset.page).toBe("editor");
    expect(document.body.textContent).not.toMatch(/[›⌄▼▾▶]/);
  });

  it("collapses to one centered fold mark without an icon chooser", async () => {
    await loadDemo();
    document.querySelector("#sidebarToggle").click();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(localStorage.getItem("zhishi:demo-sidebar-collapsed")).toBe("true");
    expect(document.querySelector('#brandButton use').getAttribute("href")).toBe("#i-fold");
    expect(document.querySelector("#logoChooser")).toBeNull();
    expect(document.querySelector("[data-logo-choice]")).toBeNull();
  });

  it("selects knowledge points and source mistakes before saving generated practice cards", async () => {
    await loadDemo();
    expect(document.querySelector("#reviewTab").hasAttribute("aria-disabled")).toBe(false);
    document.querySelector('[data-library-target="review"]').click();
    expect(document.querySelector("#reviewView").textContent).toContain("选择知识点范围");
    expect(document.querySelectorAll("[data-review-source]")).toHaveLength(3);
    expect(document.querySelector("#generationCountInput").value).toBe("3");
    expect(document.querySelector("#generationCountInput").min).toBe("3");
    document.querySelector('[data-review-point="椭圆离心率"]').click();
    document.querySelector('[data-review-source="e2"]').click();
    expect(document.querySelector(".practice-summary").textContent).toContain("4 道");
    const quantityInput = document.querySelector("#generationCountInput");
    quantityInput.value = "2";
    quantityInput.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelector("#generationCountInput").value).toBe("4");
    expect(document.querySelector('[data-generation-adjust="-1"]').disabled).toBe(true);
    document.querySelector('[data-generation-adjust="1"]').click();
    document.querySelector('[data-generation-adjust="1"]').click();
    expect(document.querySelector("#generationCountInput").value).toBe("6");
    vi.useFakeTimers();
    document.querySelector("#generatePractice").click();
    expect(document.querySelector("#reviewView").textContent).toContain("正在处理");
    await vi.advanceTimersByTimeAsync(1300);
    expect(document.querySelector("#reviewView").textContent).toContain("6 张已全部保存");
    expect(document.querySelectorAll("[data-practice-card]")).toHaveLength(6);
    const sourceIds = new Set([...document.querySelectorAll("[data-practice-card]")].map((card) => card.dataset.sourceId));
    expect(sourceIds.size).toBe(4);
    expect(document.querySelector("#reviewTab b").textContent).toBe("6");
    vi.useRealTimers();
  });

  it("removes the decorative library hero and keeps the result tools", async () => {
    await loadDemo();
    expect(document.querySelector("#libraryTitle")).toBeNull();
    expect(document.body.textContent).not.toContain("LEARNING INDEX");
    expect(document.querySelector("#resultCount").textContent).toBe("12");
  });

  it("opens a card detail from its original card and closes back to the list", async () => {
    await loadDemo();
    document.querySelector(".study-card").click();
    await Promise.resolve();
    const layer = document.querySelector("#cardDetailLayer");
    expect(layer.hidden).toBe(false);
    expect(layer.textContent).toContain("正确解法");
    layer.querySelector("[data-detail-close]").click();
    await Promise.resolve();
    expect(layer.hidden).toBe(true);
  });

  it("keeps image editing before preview insertion and exposes revision conflict", async () => {
    await loadDemo();
    document.querySelector('[data-page-target="editor"]').click();
    document.querySelector("#imageDrop").click();
    expect(document.querySelector("#imageDialog").hidden).toBe(false);
    document.querySelector('[data-rotate="90"]').click();
    expect(document.querySelector("#cropImage").style.transform).toContain("90deg");
    document.querySelector("[data-image-cancel]").click();
    document.querySelector("#conflictButton").click();
    expect(document.querySelector(".conflict-banner").textContent).toContain("revision 8");
  });

  it("selects an existing knowledge-tree node and adds it to the archive", async () => {
    await loadDemo();
    document.querySelector('[data-page-target="editor"]').click();
    document.querySelector('[data-picker-level="point"][data-picker-value="函数极值"]').click();
    expect(document.querySelector("#selectedKnowledgePath").textContent).toContain("函数极值");
    document.querySelector("#addExistingKnowledge").click();
    expect(document.querySelector("#tagEditor").textContent).toContain("函数极值");
  });

  it("uses official provider images and preserves model and key controls", async () => {
    await loadDemo();
    document.querySelector('[data-page-target="settings"]').click();
    const sources = [...document.querySelectorAll(".provider-logo img")].map((image) => image.getAttribute("src"));
    expect(sources).toEqual(expect.arrayContaining(["codex.png", "deepseek.png"]));
    expect(document.body.textContent).not.toContain("校内模型");
    document.querySelector('[data-provider="deepseek"]').click();
    document.querySelector('[data-model="deepseek-reasoner"]').click();
    expect(document.querySelector('[data-model="deepseek-reasoner"]').classList.contains("active")).toBe(true);
    document.querySelector("#toggleKey").click();
    expect(document.querySelector("#apiKeyInput").type).toBe("text");
    document.querySelector("#addProvider").click();
    expect(document.querySelector("#providerPanel").textContent).toContain("新自定义 API");
    expect(document.querySelector("#customProviderName").value).toBe("");
  });

  it("opens the Agent window with mode, permissions, mentions and manual new-chat control", async () => {
    await loadDemo();
    document.querySelector("#agentLauncher").click();
    expect(document.querySelector("#agentWindow").hidden).toBe(false);
    document.querySelector("#agentSettingsButton").click();
    expect(document.querySelector("#agentSettings").classList.contains("open")).toBe(true);
    expect(document.querySelector("#agentWindow").textContent).toContain("写入需批准");
    const input = document.querySelector("#agentInput");
    input.value = "@";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(document.querySelector("#mentionMenu").hidden).toBe(false);
    expect(document.querySelector("#newConversation").getAttribute("title")).toBe("新对话");
  });
});
