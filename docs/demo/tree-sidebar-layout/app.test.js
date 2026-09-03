import { beforeEach, describe, expect, it, vi } from "vitest";

function mountDemo() {
  document.body.innerHTML = `
    <button id="sidebarToggle" aria-expanded="true">‹</button><button id="focusToggle">专注模式</button>
    <button data-page-target="library"></button><button data-page-target="practice"></button><button data-page-target="settings"></button>
    <section data-page-view="library"></section><section data-page-view="practice"></section><section data-page-view="settings"></section>
    <button class="tree-node active" data-path="全部知识" data-count="12"></button><button class="tree-node" data-path="数学 / 函数" data-count="5"></button>
    <span id="breadcrumb"></span><h1 id="pageTitle"></h1><span id="resultCount"></span>
    <button class="knowledge-card selected" data-title="函数" data-meta="数学 / 函数"></button><button class="knowledge-card" data-title="力学" data-meta="物理 / 力学"></button>
    <aside class="inspector"><header><button></button></header></aside><h2 id="previewTitle"></h2><p id="previewMeta"></p>
    <button class="provider-row active" data-provider="codex"></button><button class="provider-row" data-provider="deepseek"></button>
    <h3 id="providerName"></h3><p id="providerSummary"></p>
    <button data-choice="A"></button><button data-choice="B"></button><button id="explanationToggle"></button><button id="nextQuestion"></button>
    <span id="questionNumber"></span><i id="practiceProgress"></i><div class="question-map"><button></button><button></button><button class="current"></button><button></button></div>`;
}

async function loadDemo() {
  await import("./app.js");
}

describe("learning space visual demo", () => {
  beforeEach(() => {
    vi.resetModules();
    history.replaceState(null, "", "#library");
    document.body.className = "";
    mountDemo();
  });

  it("switches between cards, practice and the AI-only settings view", async () => {
    await loadDemo();
    document.querySelector('[data-page-target="settings"]').click();
    expect(document.body.dataset.page).toBe("settings");
    expect(document.querySelector('[data-page-view="settings"]').classList.contains("active")).toBe(true);
    expect(location.hash).toBe("#settings");
  });

  it("keeps tree and card selection as visual context", async () => {
    await loadDemo();
    document.querySelectorAll(".tree-node")[1].click();
    document.querySelectorAll(".knowledge-card")[1].click();
    expect(document.querySelector("#breadcrumb").textContent).toBe("数学 / 函数");
    expect(document.querySelector("#resultCount").textContent).toBe("5");
    expect(document.querySelector("#previewTitle").textContent).toBe("力学");
  });

  it("previews smooth panel, answer and progress states", async () => {
    await loadDemo();
    document.querySelector("#sidebarToggle").click();
    document.querySelector("#focusToggle").click();
    document.querySelector('[data-choice="B"]').click();
    document.querySelector("#explanationToggle").click();
    document.querySelector("#nextQuestion").click();
    expect(document.body.classList.contains("sidebar-collapsed")).toBe(true);
    expect(document.body.classList.contains("focus-mode")).toBe(true);
    expect(document.body.classList.contains("hint-visible")).toBe(true);
    expect(document.querySelector('[data-choice="B"]').classList.contains("selected")).toBe(true);
    expect(document.querySelector("#practiceProgress").style.width).toBe("50%");
  });

  it("updates the selected provider presentation without saving settings", async () => {
    await loadDemo();
    document.querySelector('[data-provider="deepseek"]').click();
    expect(document.querySelector("#providerName").textContent).toBe("DeepSeek");
    expect(document.querySelector("#providerSummary").textContent).toContain("API Key");
  });
});
