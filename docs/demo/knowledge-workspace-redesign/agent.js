import { $, $$, icon, toast, confirmAction, delay } from "./ui.js";

let runVersion = 0;
let running = false;
let attachmentCount = 0;

function agentMarkup() {
  return `<div class="agent-shell"><header class="agent-header"><span class="agent-avatar">${icon("spark")}</span><span class="agent-title"><strong>知拾 Agent</strong><small>读取自动 · 写入先审批</small></span><span class="runtime-badge">交互演示</span><button class="icon-button" id="newConversation" type="button" aria-label="新对话" title="新对话">${icon("chat")}</button><button class="icon-button" id="closeAgent" type="button" aria-label="收起 Agent">${icon("close")}</button></header><div><div class="agent-controls"><div class="segmented" aria-label="Agent 模式"><button class="active" type="button" data-agent-mode="auto">自动</button><button type="button" data-agent-mode="chat">仅聊天</button></div><button class="icon-button agent-settings-button" id="agentSettingsButton" type="button" aria-label="运行设置" aria-expanded="false">${icon("sliders")}</button></div><section class="agent-settings" id="agentSettings"><span class="setting-label"><b>思考强度</b><em>下一轮生效</em></span><div class="thinking-options"><button type="button">低</button><button class="active" type="button">中</button><button type="button">高</button></div><div class="permission-list"><span class="permission-tag">${icon("search")}读取卡片</span><span class="permission-tag">${icon("tool")}整理工具</span><span class="permission-tag">${icon("shield")}写入需批准</span></div></section></div><main class="agent-timeline" id="agentTimeline">${welcomeMarkup()}</main><footer class="agent-composer"><div class="attachment-row" id="attachmentRow"></div><div class="mention-menu" id="mentionMenu" hidden><button class="active" type="button" data-mention="函数单调区间">函数单调区间与导数符号</button><button type="button" data-mention="椭圆离心率">椭圆离心率的范围判断</button><button type="button" data-mention="斜面受力">斜面模型中的受力分解</button></div><div class="composer-box"><button class="icon-button" id="attachButton" type="button" aria-label="添加图片">${icon("clip")}</button><textarea id="agentInput" placeholder="输入任务，@ 可引用卡片" aria-label="给知拾 Agent 发消息"></textarea><button class="icon-button send-button" id="sendAgent" type="button" aria-label="发送消息">${icon("send")}</button></div><button class="button stop-run" id="stopRun" type="button" hidden>${icon("stop")}<span>停止本轮</span></button></footer></div>`;
}

function welcomeMarkup() {
  return `<section class="agent-welcome"><span class="agent-avatar">${icon("spark")}</span><h3>需要我从哪里开始？</h3><p>可以搜索与归纳；创建、修改或删除卡片时，我会先展示影响并等待批准。</p><div class="quick-prompts"><button type="button">归纳今天的高频错因</button><button type="button">读取函数相关错题</button><button type="button">修改导数卡片的知识点</button><button type="button">删除重复的测试卡片</button></div></section>`;
}

function appendTimeline(html) {
  const timeline = $("#agentTimeline");
  $(".agent-welcome", timeline)?.remove();
  timeline.insertAdjacentHTML("beforeend", html);
  timeline.scrollTop = timeline.scrollHeight;
}

function setRunning(value) {
  running = value;
  $("#stopRun").hidden = !value;
  $$("[data-agent-mode], .thinking-options button, .quick-prompts button").forEach((button) => { button.disabled = value; });
  $("#sendAgent").disabled = value;
}

function completeTool(card, label) {
  card.classList.add("done");
  card.querySelector("span").textContent = label;
}

async function sendMessage(prefill) {
  if (running) return;
  const input = $("#agentInput");
  const text = (prefill ?? input.value).trim();
  if (!text && !attachmentCount) return;
  input.value = "";
  $("#mentionMenu").hidden = true;
  appendTimeline(`<div class="message user">${text || "请查看这些图片"}</div>`);
  if (text.includes("创建新对话")) {
    await delay(220);
    appendTimeline(`<div class="message agent">我不会通过聊天文本重置会话。请使用标题栏的“新对话”按钮。</div>`);
    return;
  }
  if ($('[data-agent-mode="chat"]').classList.contains("active")) {
    setRunning(true);
    const version = ++runVersion;
    await delay(320);
    if (version !== runVersion) return;
    appendTimeline(`<div class="message agent">当前为“仅聊天”模式。我不会读取卡片或调用写入工具。</div>`);
    setRunning(false);
    return;
  }
  const version = ++runVersion;
  setRunning(true);
  appendTimeline(`<div class="run-card" data-run-card><i></i><span>正在读取相关卡片</span></div>`);
  const card = $$("[data-run-card]").at(-1);
  await delay(650);
  if (version !== runVersion) return;
  completeTool(card, "已读取 4 张相关卡片");
  appendTimeline(`<div class="run-card" data-run-card><i></i><span>正在归纳证据与影响范围</span></div>`);
  const analysisCard = $$("[data-run-card]").at(-1);
  await delay(620);
  if (version !== runVersion) return;
  completeTool(analysisCard, "已完成决策摘要");
  const writeAction = /(删除|修改|创建|写入)/.test(text);
  if (writeAction) {
    appendTimeline(`<section class="approval-card" data-approval><div class="approval-head">${icon("shield")}<strong>写操作等待批准</strong></div><p>${text.includes("删除") ? "删除 1 张重复测试卡片" : "修改“函数单调区间”卡片的知识点"}</p><div class="impact-list"><span>工具：${text.includes("删除") ? "delete_card" : "update_card"}</span><span>影响：1 张卡片 · 需要刷新列表</span><span>拒绝后不会修改任何数据</span></div><div class="approval-actions"><button class="button quiet" type="button" data-reject>拒绝</button><button class="button primary" type="button" data-approve>批准执行</button></div></section>`);
    bindApproval();
    setRunning(false);
  } else {
    await delay(300);
    appendTimeline(`<div class="message agent">在 4 张相关错题中，“条件遗漏”出现 2 次，“概念混淆”出现 1 次。建议先复习导数符号表与条件概率的样本空间切换。</div>`);
    setRunning(false);
  }
  attachmentCount = 0;
  $("#attachmentRow").innerHTML = "";
}

function bindApproval() {
  const approval = $$("[data-approval]").at(-1);
  $("[data-reject]", approval).addEventListener("click", () => resolveApproval(approval, false));
  $("[data-approve]", approval).addEventListener("click", () => resolveApproval(approval, true));
}

async function resolveApproval(approval, approved) {
  $$("button", approval).forEach((button) => { button.disabled = true; });
  approval.style.opacity = ".65";
  await delay(480);
  approval.outerHTML = `<div class="run-card done"><i></i><span>${approved ? "写操作已批准并完成（UI 模拟）" : "写操作已拒绝，数据未改变"}</span></div>`;
  appendTimeline(`<div class="message agent">${approved ? "操作已完成，卡片列表已刷新。" : "已保留现有数据，没有执行写入。"}</div>`);
}

function addAttachment() {
  if (attachmentCount >= 3) { toast("每轮最多附加 3 张图片", "warning"); return; }
  attachmentCount += 1;
  const row = $("#attachmentRow");
  row.insertAdjacentHTML("beforeend", `<span class="attachment" data-attachment>${icon("image")}<button type="button" aria-label="移除附件">×</button></span>`);
  const item = row.lastElementChild;
  $("button", item).addEventListener("click", () => { item.remove(); attachmentCount -= 1; });
}

function stopRun() {
  if (!running) return;
  runVersion += 1;
  setRunning(false);
  appendTimeline(`<div class="run-card done"><i></i><span>本轮已取消，迟到事件已忽略</span></div>`);
}

function resetConversation() {
  runVersion += 1;
  setRunning(false);
  $$("[data-approval]").forEach((approval) => { approval.outerHTML = `<div class="run-card done"><i></i><span>待审批写操作已自动拒绝</span></div>`; });
  $("#agentTimeline").innerHTML = welcomeMarkup();
  bindQuickPrompts();
  attachmentCount = 0;
  $("#attachmentRow").innerHTML = "";
}

function bindQuickPrompts() {
  $$(".quick-prompts button").forEach((button) => button.addEventListener("click", () => sendMessage(button.textContent)));
}

function bindWindow(closeAgent) {
  $("#closeAgent").addEventListener("click", closeAgent);
  $("#newConversation").addEventListener("click", () => confirmAction({ title: "开始新对话？", description: "活动运行会被取消，待审批写操作会自动拒绝。", confirmText: "新对话", onConfirm: resetConversation }));
  $("#agentSettingsButton").addEventListener("click", (event) => { const open = $("#agentSettings").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
  $$("[data-agent-mode]").forEach((button) => button.addEventListener("click", () => { $$("[data-agent-mode]").forEach((item) => item.classList.remove("active")); button.classList.add("active"); }));
  $$(".thinking-options button").forEach((button) => button.addEventListener("click", () => { $$(".thinking-options button").forEach((item) => item.classList.remove("active")); button.classList.add("active"); }));
  $("#attachButton").addEventListener("click", addAttachment);
  $("#agentWindow").addEventListener("dragover", (event) => event.preventDefault());
  $("#agentWindow").addEventListener("drop", (event) => { event.preventDefault(); addAttachment(); });
  $("#sendAgent").addEventListener("click", () => sendMessage());
  $("#stopRun").addEventListener("click", stopRun);
  $("#agentInput").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
  $("#agentInput").addEventListener("input", (event) => { $("#mentionMenu").hidden = !event.target.value.includes("@"); });
  $$("[data-mention]").forEach((button) => button.addEventListener("click", () => { $("#agentInput").value = `@${button.dataset.mention} `; $("#mentionMenu").hidden = true; $("#agentInput").focus(); }));
  bindQuickPrompts();
}

export function setupAgent() {
  const launcher = $("#agentLauncher");
  const windowElement = $("#agentWindow");
  const closeAgent = () => {
    if (windowElement.hidden) return;
    windowElement.classList.remove("open");
    windowElement.classList.add("closing");
    launcher.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    setTimeout(() => { windowElement.hidden = true; windowElement.classList.remove("closing"); launcher.focus(); }, 190);
  };
  launcher.addEventListener("click", () => {
    windowElement.innerHTML = agentMarkup();
    windowElement.hidden = false;
    windowElement.classList.add("open");
    launcher.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    bindWindow(closeAgent);
    $("#agentInput").focus();
  });
  return { closeAgent };
}
