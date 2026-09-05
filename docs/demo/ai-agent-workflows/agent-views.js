(() => {
const { action, escapeHtml, icon } = window.AgentPrototypePageViews;
const terminal = new Set(["completed", "cancelled"]);
const statusCopy = {
  queued: "排队中", running: "运行中", cancel_requested: "正在停止", needs_input: "需补充", waiting_plan: "待批准计划",
  waiting_review: "待审核", repairing: "修复中", completed: "已完成", failed: "失败",
  interrupted: "已中断", cancelled: "已取消",
};
function currentTask(state) { return state.tasks.find((item) => item.id === state.agent.taskId); }
function sourceCount(state, kind = "practice") { return kind === "knowledge" ? state.selectedSources.mistakes.length : state.selectedSources.knowledge.length + state.selectedSources.mistakes.length; }
function taskKindLabel(kind) { return { photo: "整理错题照片", knowledge: "生成或完善知识卡", practice: "生成练习" }[kind] || "AI 任务"; }
function statusClass(status) { return ["failed", "interrupted"].includes(status) ? "failed" : ["queued", "needs_input", "waiting_plan", "waiting_review"].includes(status) ? "waiting" : ""; }
function launcherState(state) {
  const pending = state.tasks.filter((task) => !terminal.has(task.status));
  const count = (status) => pending.filter((task) => task.status === status).length;
  if (count("waiting_review")) return { label: `待审核 ${count("waiting_review")} 项`, badge: String(count("waiting_review")), status: "waiting_review" };
  if (count("needs_input")) return { label: `需补充 ${count("needs_input")} 项`, badge: String(count("needs_input")), status: "needs_input" };
  if (count("failed") || count("interrupted")) return { label: "有任务待恢复", badge: "!", status: "failed" };
  if (count("running") || count("repairing") || count("cancel_requested")) return { label: count("cancel_requested") ? "任务正在停止" : "任务运行中", badge: "1", status: "running" };
  if (count("queued")) return { label: `排队中 ${count("queued")} 项`, badge: String(count("queued")), status: "queued" };
  return { label: "准备就绪", badge: "", status: "idle" };
}
function render(elements, state) {
  const task = currentTask(state);
  const launcher = launcherState(state);
  elements.agentWindow.hidden = !state.agent.open;
  elements.agentLauncher.hidden = state.agent.open;
  elements.agentLauncher.setAttribute("aria-expanded", String(state.agent.open));
  elements.launcherStatus.textContent = launcher.label;
  elements.agentLauncher.setAttribute("aria-label", `打开 AI Agent，${launcher.label}`);
  elements.launcherBadge.hidden = !launcher.badge;
  elements.launcherBadge.textContent = launcher.badge;
  elements.agentLauncher.dataset.status = launcher.status;
  const title = state.agent.view === "draft" ? `${taskKindLabel(state.agent.draftKind)} · 任务草稿` : task ? task.title : "任务首页";
  const pendingCount = state.tasks.filter((item) => !terminal.has(item.status)).length;
  const label = task ? statusCopy[task.status] : state.agent.view === "draft" ? "尚未派发" : pendingCount ? `${pendingCount} 项待处理` : "准备就绪";
  elements.taskTitle.textContent = title;
  elements.taskStatus.textContent = label;
  elements.taskStatus.className = `task-status ${statusClass(task?.status || (pendingCount ? "queued" : ""))}`;
  elements.taskProgress.innerHTML = progress(task);
  elements.agentContext.innerHTML = `<span>统一规则</span><div><span class="context-chip">一处创建任务</span><span class="context-chip">任务持久保留</span><span class="context-chip">写入仍需审核</span></div>`;
  elements.timeline.innerHTML = state.agent.view === "draft" ? draftView(state) : task && state.agent.view === "task" ? taskView(state, task) : homeView(state);
  elements.agentActions.innerHTML = state.agent.view === "draft" ? draftActions(state) : task && state.agent.view === "task" ? taskActions(task) : "";
  elements.stopButton.hidden = !task || !["running", "repairing"].includes(task.status);
  elements.composerInput.placeholder = task ? "补充要求只进入当前任务的新版本" : "先提问，或从上方选择一个明确任务";
}
function progress(task) {
  const phase = task ? ({ queued: 1, waiting_plan: 1, running: 2, cancel_requested: 2, needs_input: 2, repairing: 2, waiting_review: 3, completed: 4, cancelled: 4, failed: 2, interrupted: 2 }[task.status] ?? 0) : -1;
  return ["材料", "派发", "分析", "审核", "完成"].map((label, index) => `<li class="${index < phase ? "done" : index === phase ? "active" : ""}">${label}</li>`).join("");
}
function homeView(state) {
  const choices = [
    ["photo", "整理错题照片", "上传照片或引用已有草稿，生成可逐字段审核的错题提案。", "photo"],
    ["knowledge", "生成或完善知识卡", "选择一个具体知识点和明确错题来源，生成可回滚的聚合草稿。", "book"],
    ["practice", "生成练习", "明确加入知识卡/错题，先批准批次计划，再事务保存。", "cards"],
  ];
  const tasks = [...state.tasks].reverse();
  return `<div class="message agent">这里是唯一的 Agent 工作区。先选择你要完成的任务；仅打开我不会读取当前页面，也不会自动运行。</div>
    <section class="agent-home"><span class="card-label">${icon("spark")}新建任务</span><div class="task-choice-grid">${choices.map(([kind, title, text, glyph]) => `<button type="button" data-agent-task="${kind}"><span>${icon(glyph)}</span><div><strong>${title}</strong><small>${text}</small></div>${icon("chevron")}</button>`).join("")}</div></section>
    <section class="task-inbox"><header><span class="card-label">${icon("clock")}任务记录</span><strong>${tasks.length ? `${tasks.length} 项` : "暂无任务"}</strong></header>${tasks.length ? tasks.map(taskRow).join("") : `<p>从上方创建任务；页面切换、新对话或收起窗口都不会删除任务。</p>`}</section>`;
}
function taskRow(task) {
  const origin = task.origin === "capture" ? "来自新建错题页" : "在 Agent 内创建";
  return `<button class="task-inbox-row" type="button" data-open-task="${task.id}"><span class="task-dot ${task.status}"></span><div><strong>${escapeHtml(task.title)}</strong><small>${origin} · ${escapeHtml(task.snapshotAt)}</small></div><b>${statusCopy[task.status]}</b>${icon("chevron")}</button>`;
}
function draftView(state) {
  const kind = state.agent.draftKind;
  if (kind === "photo") {
    const attachments = state.agent.draftAttachments;
    return `<div class="message agent">在 Agent 内也能创建同一个 <strong>organize_mistake</strong> 任务。这里上传的是任务自有附件；取消时不会误删已有卡片图片。</div><section class="agent-draft-card"><span class="card-label">${icon("photo")}照片与范围</span>
      <button class="agent-upload" type="button" data-action="add-agent-photo">${icon("upload")}<span><strong>${attachments.length ? `已添加 ${attachments.length} 张照片` : "添加错题照片"}</strong><small>最多 3 张 · PNG/JPG/WebP · 单张不超过 15MB</small></span></button>
      ${attachments.length ? `<div class="agent-attachments">${attachments.map((item, index) => `<span>${index + 1}. ${escapeHtml(item.name)}<button type="button" data-remove-agent-photo="${item.id}" aria-label="删除 ${escapeHtml(item.name)}">×</button></span>`).join("")}</div>` : ""}
      <label>题号 / 小问范围<input data-agent-draft-input="scope" value="${escapeHtml(state.agent.draftScope)}" placeholder="例如：第 44 题（2）"></label>
      <label>补充要求（可选）<textarea data-agent-draft-input="requirements" maxlength="500">${escapeHtml(state.agent.draftRequirements)}</textarea></label>
      <p>多张照片默认视为同一道题；如果边界不明确，任务会先进入“需补充”。</p></section>`;
  }
  const kindName = kind === "knowledge" ? "知识卡" : "练习";
  return `<div class="message agent">先明确选择本次任务可以读取的卡片。知识点关系不会自动扩展上下文。</div><section class="agent-draft-card"><span class="card-label">${icon(kind === "knowledge" ? "book" : "cards")}生成${kindName}</span>
    <div class="source-draft-summary"><div><span>明确来源</span><strong>${sourceCount(state, kind)} 张卡片</strong><small>${kind === "knowledge" ? `仅 ${state.selectedSources.mistakes.length} 张错题` : `${state.selectedSources.knowledge.length} 张知识卡 · ${state.selectedSources.mistakes.length} 张错题`}</small></div>${action("选择来源", "choose-sources")}</div>
    ${kind === "practice" ? `<label>练习数量<input type="number" min="1" max="50" data-config-input="count" value="${state.config.count}"></label><label>难度<select data-config-input="difficulty"><option value="basic">基础</option><option value="medium" ${state.config.difficulty === "medium" ? "selected" : ""}>中等</option><option value="advanced">进阶</option></select></label>` : `<label>目标知识点<select data-config-input="knowledgePoint"><option>导数与单调性</option><option>函数定义域</option><option>极值</option></select></label>`}
    <label>补充要求（可选）<textarea data-config-input="prompt" maxlength="500">${escapeHtml(state.config.prompt)}</textarea></label>
    <p>改变这里的草稿不会调用模型；只有下方“创建任务”才会冻结快照。</p></section>`;
}
function draftActions(state) {
  const ready = state.agent.draftKind === "photo" ? state.agent.draftAttachments.length : sourceCount(state, state.agent.draftKind);
  return `${action("返回任务首页", "agent-home")}${action(state.agent.draftKind === "practice" ? "创建任务并查看计划" : "创建任务", "deploy-agent-task", "primary", ready ? "" : "disabled")}`;
}
function taskView(state, task) {
  let html = `<div class="message user">${escapeHtml(task.summary)}</div><article class="snapshot-card"><span class="card-label">${icon("shield")}已冻结的任务快照</span><div><span>来源</span><strong>${escapeHtml(task.sourceLabel)}</strong></div><div><span>范围</span><strong>${escapeHtml(task.scope || "未指定")}</strong></div><small>${task.id} · ${escapeHtml(task.snapshotAt)} · ${task.origin === "capture" ? "borrowed 图片" : "owned_upload / 明确卡片来源"}</small></article>`;
  if (task.status === "queued") return html + note("任务已安全排队", `前方 ${task.queuePosition || 1} 项。队列是单执行器串行，不代表多个 Agent 并行。`, "clock");
  if (task.status === "running") return html + tool(`${task.kind}.analyze`, task.kind === "practice" ? `正在生成 ${task.requestedCount} 道练习` : "正在解析快照并生成结构化提案", true) + note("可以收起或切换页面", "任务继续运行；完成后只更新状态，不自动跳转或抢焦点。", "info");
  if (task.status === "cancel_requested") return html + tool(`${task.kind}.cancel`, "已发送停止请求，等待当前模型调用返回", true) + note("尚未显示为已取消", "停止真正完成前不会启动与它冲突的下一个任务。", "clock");
  if (task.status === "needs_input") return html + `<article class="needs-card"><span class="card-label">${icon("alert")}需要你补充</span><h3>照片中检测到两个题号区域</h3><p>请确认仍只整理“${escapeHtml(task.scope || "当前指定范围") }”。确认只会创建新任务版本，不会修改已发送快照。</p></article>`;
  if (task.status === "waiting_plan") return html + `<article class="plan-card"><span class="card-label">${icon("shield")}待批准批次计划</span><h3>生成 ${task.requestedCount} 道${task.difficulty === "medium" ? "中等" : ""}练习</h3><div class="fact-grid"><div class="fact"><span>明确来源</span><strong>${escapeHtml(task.sourceLabel)}</strong></div><div class="fact"><span>写入方式</span><strong>结构通过后整批保存</strong></div></div><div class="approval-note">${icon("alert")}批准授权生成、结构修复与事务保存，不代表 AI 已验证答案质量。</div></article>`;
  if (task.status === "repairing") return html + tool("practice_cards.validate", "第 4 题 solution 字段为空", false) + note("正在修复失败候选 · 第 1/3 次", "其他已通过候选保持不变；整批尚未写入。", "alert");
  if (task.status === "waiting_review") {
    const route = task.kind === "photo" ? "open-mistake-review" : "open-knowledge-review";
    const title = task.kind === "photo" ? "错题字段建议待审核" : "知识卡聚合草稿待审核";
    return html + tool("proposals.create", task.kind === "photo" ? "已生成带证据的字段提案" : "已生成 1 个知识点的可回滚草稿", false) + result(title, "AI 尚未写入正式卡片；审核、编辑和保存是独立动作。", task.kind === "photo" ? "打开字段审核" : "打开知识卡草稿", route);
  }
  if (task.status === "completed") return html + result("任务已完成", task.kind === "photo" ? "建议已进入编辑草稿；正式卡片是否保存由创建页显示。" : "已处理完本任务的所有提案或批次。", task.kind === "practice" ? "打开练习批次" : "返回结果页面", task.kind === "practice" ? "open-completed-batch" : task.kind === "photo" ? "capture-new" : "knowledge-list");
  if (task.status === "interrupted") return html + note("应用退出时任务仍在运行", "系统没有伪装为继续运行。可从同一快照开始新的 attempt，或取消任务。", "alert");
  if (task.status === "failed") return html + note("任务未完成", "错误原因和输入快照已保留；安全重试不会创建重复卡片。", "alert");
  return html + note("任务已取消", "仅停止任务；原始草稿、借用图片和已保存结果均保留。", "info");
}
function taskActions(task) {
  const home = action("任务首页", "agent-home");
  if (task.status === "queued") return `${home}${action("取消排队", "cancel-task", "danger")}`;
  if (task.status === "running" && task.kind === "photo") return `${home}${action("模拟边界不清", "task-needs-input")}${action("生成审核提案", "task-finish-analysis", "primary")}`;
  if (task.status === "running" && task.kind === "knowledge") return `${home}${action("生成知识卡草稿", "task-finish-analysis", "primary")}`;
  if (task.status === "running" && task.kind === "practice") return `${home}${action("模拟结构错误", "task-repair")}${action("完成并保存整批", "task-complete", "primary")}`;
  if (task.status === "needs_input") return `${home}${action("确认只整理指定小问", "confirm-task-scope", "primary")}${action("取消任务", "cancel-task", "danger")}`;
  if (task.status === "waiting_plan") return `${home}${action("返回调整", "edit-current-task")}${action("批准计划", "approve-plan", "primary")}`;
  if (task.status === "repairing") return `${home}${action("模拟达到上限", "task-fail", "danger")}${action("完成修复并保存", "task-complete", "primary")}`;
  if (["failed", "interrupted"].includes(task.status)) return `${home}${action("取消任务", "cancel-task", "danger")}${action("从快照重试", "retry-task", "primary")}`;
  return home;
}
function tool(name, detail, running) { return `<div class="tool-card ${running ? "running" : ""}"><span class="tool-icon">${icon(running ? "refresh" : "tool")}</span><div><strong>${name}</strong><small>${detail}</small></div><span class="tool-state">${running ? "运行中" : "已完成"}</span></div>`; }
function note(title, text, glyph) { return `<article class="recovery-card"><span class="card-label">${icon(glyph)}任务状态</span><h3>${title}</h3><p>${text}</p></article>`; }
function result(title, text, label, route) { return `<article class="result-card"><span class="card-label">${icon("check")}需要你处理</span><h3>${title}</h3><p>${text}</p><button class="result-link" type="button" data-action="${route}">${label}${icon("external")}</button></article>`; }
window.AgentPrototypeAgentViews = { render };
})();
