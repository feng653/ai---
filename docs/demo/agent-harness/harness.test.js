import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "./data.js";
import "./harness.js";
import "./runtime.js";
import "./render.js";

const { createPlan } = globalThis.AgentHarnessDemo;
const { DemoRuntime } = globalThis.AgentHarnessRuntime;
const toolNames = (events) => events.filter((event) => event.type === "toolStart").map((event) => event.name);

describe("AI Agent Harness demo plans", () => {
  it("keeps ordinary chat on the zero-tool path", () => {
    const plan = createPlan("你好，介绍一下你能做什么", { mode: "auto", reasoning: "medium" });
    expect(plan.intent).toBe("chat");
    expect(toolNames(plan.beforeApproval)).toEqual([]);
    expect(plan.beforeApproval.at(-1).text).toContain("直接陪你讨论");
  });

  it("uses search and get before answering a research request", () => {
    const plan = createPlan("查找函数单调性的错题并总结", { mode: "auto" });
    expect(toolNames(plan.beforeApproval)).toEqual(["cards.search", "cards.get"]);
    expect(plan.beforeApproval.at(-1).text).toContain("找到 1 张相关错题");
  });

  it("does not place a write tool before approval", () => {
    const plan = createPlan("修改函数单调性卡片的解题过程", { mode: "auto" });
    expect(toolNames(plan.beforeApproval)).toEqual(["cards.search", "cards.get"]);
    expect(plan.beforeApproval.at(-1).type).toBe("approval");
    expect(toolNames(plan.approved)).toEqual(["cards.update"]);
    expect(toolNames(plan.rejected)).toEqual([]);
  });

  it("requires explicit approval for deletion", () => {
    const plan = createPlan("删除摩擦力错题卡片", { mode: "auto" });
    expect(plan.beforeApproval.at(-1)).toMatchObject({ type: "approval", name: "cards.delete" });
    expect(toolNames(plan.approved)).toEqual(["cards.delete"]);
  });

  it("forces tool-requiring requests onto a no-tool response in chat-only mode", () => {
    const plan = createPlan("修改函数单调性卡片", { mode: "chat" });
    expect(toolNames([...plan.beforeApproval, ...plan.approved])).toEqual([]);
    expect(plan.beforeApproval.at(-1).text).toContain("工具已被运行时禁用");
  });
});

describe("AI Agent Harness demo runtime", () => {
  beforeEach(() => vi.useFakeTimers());

  it("pauses at approval and executes the write exactly once after approval", async () => {
    const events = [];
    const runtime = new DemoRuntime((event) => events.push(event));
    const plan = createPlan("修改函数单调性卡片", { mode: "auto" });
    const started = runtime.start(plan);
    await vi.runAllTimersAsync();
    await started;
    expect(runtime.waiting?.name).toBe("cards.update");
    expect(events.filter((event) => event.type === "toolStart" && event.name === "cards.update")).toHaveLength(0);

    const resolved = runtime.resolveApproval(true);
    await vi.runAllTimersAsync();
    await resolved;
    expect(events.filter((event) => event.type === "toolStart" && event.name === "cards.update")).toHaveLength(1);
    expect(events.at(-1).type).toBe("runComplete");
  });

  it("stops future steps when cancelled", async () => {
    const events = [];
    const runtime = new DemoRuntime((event) => events.push(event));
    const started = runtime.start(createPlan("查找函数单调性的错题", { mode: "auto" }));
    runtime.cancel();
    await vi.runAllTimersAsync();
    await started;
    expect(events.map((event) => event.type)).toEqual(["runStart", "cancelled"]);
  });
});

describe("AI Agent Harness demo document", () => {
  it("keeps all demo dependencies local to its semantic directory", () => {
    const html = readFileSync(resolve("docs/demo/agent-harness/index.html"), "utf8");
    for (const file of ["base.css", "agent.css", "responsive.css", "data.js", "harness.js", "runtime.js", "render.js", "app.js"]) {
      expect(html).toContain(`./${file}`);
    }
    expect(html).toContain('id="agentPanel"');
    expect(html).toContain('data-mode="chat"');
  });

  it("makes a pending approval inert when the run is cancelled", () => {
    document.body.innerHTML = '<div id="timeline"></div>';
    const timeline = document.querySelector("#timeline");
    const renderer = globalThis.AgentHarnessRenderer.createRenderer(timeline);
    renderer.render({ type: "runStart", runId: "run-test" });
    renderer.render({
      type: "approval",
      runId: "run-test",
      approvalId: "approval-test",
      name: "cards.delete",
      target: "测试卡片",
      impact: "删除",
      revision: 1,
    });
    renderer.render({ type: "cancelled", runId: "run-test" });
    expect(timeline.querySelector(".approval-card").classList).toContain("resolved");
    expect(timeline.querySelector(".approval-result").textContent).toBe("已取消");
    expect(timeline.querySelector(".approval-card footer")).not.toBeVisible();
  });
});
