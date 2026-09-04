(() => {
const { icon } = window.AgentPrototypePageViews;
function statusClass(status) { return ["failed","repairing"].includes(status) ? "failed" : ["waiting","review"].includes(status) ? "waiting" : ""; }
function render(elements, state) {
  const agent = state.agent;
  elements.agentWindow.hidden = !agent.open;
  elements.agentLauncher.hidden = agent.open;
  elements.agentLauncher.setAttribute("aria-expanded", String(agent.open));
  elements.launcherStatus.textContent = agent.label;
  elements.agentLauncher.setAttribute("aria-label", `打开 AI Agent，${agent.label}`);
  elements.launcherBadge.hidden = !agent.badge;
  elements.launcherBadge.textContent = agent.badge;
  elements.agentLauncher.dataset.status = agent.status;
  elements.taskTitle.textContent = agent.task || "暂无进行中的任务";
  elements.taskStatus.textContent = agent.label;
  elements.taskStatus.className = `task-status ${statusClass(agent.status)}`;
  elements.taskProgress.innerHTML = ["配置","计划","执行","修复","结果"].map((label,index)=>`<li class="${index < agent.phase ? "done" : index === agent.phase ? "active" : ""}">${label}</li>`).join("");
  elements.agentContext.innerHTML = `<span>职责边界</span><div><span class="context-chip">Agent 管进度与对话</span><span class="context-chip">主区管选择与审核</span></div>`;
  elements.timeline.innerHTML = timeline(state);
  elements.agentActions.innerHTML = actions(state);
  elements.stopButton.hidden = agent.status !== "running" && agent.status !== "repairing";
}
function timeline(state) {
  const a = state.agent;
  let html = `<div class="message agent">结构化输入在外部设置窗完成。我在这里报告计划、执行、错误和结果，不会占用主内容审核区。</div>`;
  if (a.status === "idle") return html;
  html += `<div class="message user">${state.config.prompt || "按当前设置执行。"}</div>`;
  if (a.status === "waiting") return html + `<article class="plan-card"><span class="card-label">${icon("shield")}待批准计划</span><h3>${a.task}</h3><div class="fact-grid"><div class="fact"><span>数量</span><strong>${state.config.count || state.config.maxCards}</strong></div><div class="fact"><span>上下文</span><strong>${sourceCount(state)} 张具体卡片</strong></div></div><div class="approval-note">${icon("alert")}练习计划批准后会进行本地结构校验并事务保存整批。</div></article>`;
  if (a.status === "running") return html + tool("practice_batches.generate", `生成中 2/${state.config.count}`, true) + note("可以收起 Agent 或切换页面。完成后不会自动跳转。","当前主内容和焦点都会保留。 ");
  if (a.status === "repairing") return html + tool("practice_cards.validate", "第 4 题 · solution 字段为空", false) + note("正在修复失败卡片 · 第 1/3 次","错误已回传同一 Agent；其余通过的候选保持不变，整批尚未写入。 ");
  if (a.status === "review") { const editing = a.task.includes("修改当前"); const count = editing ? 1 : 3; return html + tool("proposals.create", `已生成 ${count} 张知识卡提案`, false) + result(`有 ${count} 张知识卡待审核`, "审核发生在主内容区；当前提案可编辑、拒绝或保存。", "打开逐卡审核", "open-knowledge-review"); }
  if (a.status === "practice-review") return html + tool("practice_card.propose", "已生成当前练习卡的字段建议", false) + result("练习卡修改待审核","只读取当前卡，不会读取整批或创建知识点。","打开字段编辑","open-practice-edit-review");
  if (a.status === "mistake-review") return html + tool("mistake.propose", "已生成 3 项字段建议", false) + result("错题建议待审核","不会直接覆盖当前内容。","打开字段比较","open-mistake-review");
  if (a.status === "completed") return html + tool("practice_batches.save", `${state.config.count} 题已通过结构校验并事务保存`, false) + result("练习批次已完成","没有自动跳转；点击后才打开本批。","打开本批练习","open-completed-batch");
  if (a.status === "failed") return html + note("自动修复已达到 3 次上限","可调整要求后重试，或放弃本次任务；没有保存半批数据。 ");
  return html;
}
function sourceCount(state) { return state.selectedSources.knowledge.length + state.selectedSources.mistakes.length; }
function tool(name, detail, running) { return `<div class="tool-card ${running?"running":""}"><span class="tool-icon">${icon(running?"refresh":"tool")}</span><div><strong>${name}</strong><small>${detail}</small></div><span class="tool-state">${running?"运行中":"已完成"}</span></div>`; }
function note(title, text) { return `<article class="recovery-card"><span class="card-label">${icon("info")}任务状态</span><h3>${title}</h3><p>${text}</p></article>`; }
function result(title,text,label,action) { return `<article class="result-card"><span class="card-label">${icon("check")}需要你处理</span><h3>${title}</h3><p>${text}</p><button class="result-link" type="button" data-action="${action}">${label}${icon("external")}</button></article>`; }
function actions(state) {
  const status = state.agent.status;
  if (status === "waiting") return `<button class="action-chip primary" type="button" data-action="approve-plan">批准计划并自动入库</button><button class="action-chip" type="button" data-action="adjust-plan">调整设置</button>`;
  if (status === "running") return `<button class="action-chip primary" type="button" data-action="simulate-validation">模拟结构报错</button><button class="action-chip" type="button" data-action="minimize-agent">收起观察</button>`;
  if (status === "repairing") return `<button class="action-chip primary" type="button" data-action="complete-run">完成修复并保存整批</button><button class="action-chip danger" type="button" data-action="repair-limit">模拟达到上限</button>`;
  if (status === "failed") return `<button class="action-chip primary" type="button" data-action="retry-run">调整后重试</button><button class="action-chip danger" type="button" data-action="abandon-run">放弃任务</button>`;
  return "";
}
window.AgentPrototypeAgentViews = { render };
})();
