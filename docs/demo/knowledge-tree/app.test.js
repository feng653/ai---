import { beforeEach, describe, expect, it, vi } from "vitest";

function mountDemoShell() {
  document.body.innerHTML = `
    <input id="treeSearch">
    <ul id="knowledgeTree"></ul>
    <span id="activePath"></span>
    <button id="clearFilter"></button>
    <h2 id="resultTitle"></h2>
    <span id="resultMeta"></span>
    <span id="cardTabCount"></span>
    <div class="view-tabs">
      <button data-view="cards"></button>
      <button data-view="knowledge"></button>
      <button data-view="review"></button>
      <span id="knowledgeTabCount"></span>
      <em id="viewHint"></em>
    </div>
    <div id="viewContent"></div>`;
}

async function loadDemo() {
  await import("./data.js");
  await import("./learning.js");
  await import("./app.js");
}

describe("integrated knowledge tree demo", () => {
  beforeEach(() => {
    vi.resetModules();
    mountDemoShell();
  });

  it("keeps tutorial and review inside the selected leaf context", async () => {
    await loadDemo();
    const leaf = document.querySelector('[data-select="数学/函数/函数单调性"]');
    leaf.click();

    expect(document.querySelector("#activePath").textContent).toBe("数学 / 函数 / 函数单调性");
    const knowledgeTab = document.querySelector('[data-view="knowledge"]');
    const reviewTab = document.querySelector('[data-view="review"]');
    expect(knowledgeTab.disabled).toBe(false);

    knowledgeTab.click();
    expect(document.querySelector("#viewContent").textContent).toContain("函数单调性 · 知识卡片");
    expect(document.querySelector("#viewContent").textContent).toContain("你的易错提醒");
    expect(document.querySelector("#viewContent details")).not.toBeNull();

    reviewTab.click();
    expect(document.querySelectorAll(".questions > article")).toHaveLength(3);
    const count = document.querySelector("[data-review-count]");
    count.value = "5";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelectorAll(".questions > article")).toHaveLength(5);
    document.querySelector('[data-action="reveal"]').click();
    expect(document.querySelector(".answer").textContent).toContain("答案");
    document.querySelector('[data-action="master"]').click();
    expect(document.querySelector(".learning-head small").textContent).toContain("1/5 已掌握");
  });

  it("lists knowledge cards at chapter level and only disables review", async () => {
    await loadDemo();
    document.querySelector('[data-select="数学/函数"]').click();
    expect(document.querySelector('[data-view="knowledge"]').disabled).toBe(false);
    expect(document.querySelector('[data-view="review"]').disabled).toBe(true);
    expect(document.querySelector('[data-view="knowledge"]').classList.contains("active")).toBe(true);
    expect(document.querySelectorAll(".knowledge-card-grid > article")).toHaveLength(3);
  });

  it("aggregates multiple mistakes into one knowledge card", async () => {
    await loadDemo();
    expect(document.querySelector("#activePath").textContent).toContain("一元二次不等式");
    expect(document.querySelector(".knowledge-evidence").textContent).toContain("3 道来源错题");
    expect(document.querySelectorAll(".mistake-patterns article")).toHaveLength(3);
  });
});
