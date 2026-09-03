import { providers, modelOptions } from "./data.js";
import { $, $$, icon, toast, confirmAction, delay } from "./ui.js";

let selectedProvider = "codex";

function logoMarkup(provider) {
  return provider.logo ? `<span class="provider-logo"><img src="${provider.logo}" width="40" height="40" alt="" /></span>` : `<span class="provider-logo custom">${icon("plug")}</span>`;
}

function providerListMarkup() {
  return `<div class="provider-list-title"><strong>服务商</strong><small>选择后在右侧配置</small></div>${providers.map((provider) => `<button class="provider-card ${provider.id === selectedProvider ? "active" : ""}" type="button" data-provider="${provider.id}">${logoMarkup(provider)}<span class="provider-copy"><strong>${provider.name}</strong><small>${provider.summary}</small></span><span class="provider-state ${provider.tone}">${provider.state}</span></button>`).join("")}<button class="add-provider ${selectedProvider === "custom" ? "active" : ""}" id="addProvider" type="button">${icon("add")}<span>添加自定义 API</span></button>`;
}

function modelsMarkup(id) {
  return `<div class="model-picker" aria-label="模型选择">${modelOptions[id].map((model, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-model="${model}">${model}</button>`).join("")}</div>`;
}

function codexPanel() {
  const provider = providers[0];
  return `<div class="provider-heading">${logoMarkup(provider)}<div><h2>Codex</h2><p>知拾专用登录 · 不读取本机 Codex 配置</p></div><span class="availability"><i></i>当前可用</span></div><div class="setting-list"><div class="setting-item"><span class="setting-copy"><strong>默认模型</strong><small>用于卡片整理、知识生成与 Agent。</small></span>${modelsMarkup("codex")}</div><div class="setting-item"><span class="setting-copy"><strong>凭据边界</strong><small>浏览器授权只写入知拾专用登录目录；退出不影响其他 Codex 会话。</small></span><span class="status-chip">独立凭据</span></div></div><div class="login-card"><div class="login-step"><span>1</span><strong>打开授权页面</strong><small>由 Codex 启动官方登录流程。</small></div><div class="login-step"><span>2</span><strong>完成浏览器登录</strong><small>返回知拾后自动检查状态。</small></div><div class="login-step"><span>3</span><strong>设为当前服务</strong><small>后续 AI 请求使用此服务。</small></div></div><div class="provider-actions"><button class="button danger-link" id="disconnectProvider" type="button">退出登录</button><button class="button quiet" id="reloginProvider" type="button">重新登录</button><button class="button primary" id="setCurrentProvider" type="button">设为当前</button></div>`;
}

function apiPanel(id) {
  const isCustom = id === "custom";
  const provider = providers.find((item) => item.id === id) ?? { id: "custom", name: "新自定义 API", summary: "兼容 OpenAI Chat Completions", state: "待保存", tone: "" };
  const modelControl = isCustom ? `<span class="setting-control"><input id="customModelName" value="" placeholder="输入模型名称" aria-label="模型名称" /></span>` : modelsMarkup(id);
  return `<div class="provider-heading">${logoMarkup(provider)}<div><h2>${provider.name}</h2><p>${isCustom ? "OpenAI Chat Completions 兼容服务" : "DeepSeek 官方 OpenAI 兼容接口"}</p></div><span class="availability"><i></i>${provider.state}</span></div><div class="setting-list">${isCustom ? `<div class="setting-item"><span class="setting-copy"><strong>服务名称</strong><small>用于在供应商列表中识别此配置。</small></span><span class="setting-control"><input id="customProviderName" value="" placeholder="例如：我的 API" aria-label="服务名称" /></span></div>` : ""}<div class="setting-item"><span class="setting-copy"><strong>模型</strong><small>${isCustom ? "填写服务端提供的准确模型名称。" : "保留原有模型选择；选项面板不使用下拉小三角。"}</small></span>${modelControl}</div><div class="setting-item"><span class="setting-copy"><strong>Base URL</strong><small>请求将发送到此服务地址。</small></span><span class="setting-control"><input value="${isCustom ? "" : "https://api.deepseek.com"}" placeholder="https://api.example.com/v1" aria-label="Base URL" /></span></div><div class="setting-item"><span class="setting-copy"><strong>API Key</strong><small>已保存密钥不会回显；留空保存会保留原值。</small></span><span class="setting-control"><input id="apiKeyInput" type="password" value="" placeholder="留空以保留已保存密钥" aria-label="API Key" /><button class="button quiet" id="toggleKey" type="button">显示</button></span></div></div><div class="provider-actions"><button class="button danger-link" id="deleteProvider" type="button">${isCustom ? "取消新增" : "删除配置"}</button><button class="button quiet" id="testProvider" type="button">测试连接</button><button class="button primary" id="saveProvider" type="button">保存并设为当前</button></div>`;
}

function renderPanel() {
  $("#providerPanel").innerHTML = selectedProvider === "codex" ? codexPanel() : apiPanel(selectedProvider);
  $$("[data-model]", $("#providerPanel")).forEach((button) => button.addEventListener("click", () => {
    $$("[data-model]", $("#providerPanel")).forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  }));
  $("#toggleKey")?.addEventListener("click", (event) => {
    const input = $("#apiKeyInput");
    input.type = input.type === "password" ? "text" : "password";
    event.currentTarget.textContent = input.type === "password" ? "显示" : "隐藏";
  });
  $("#testProvider")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "测试中…";
    await delay(700);
    event.currentTarget.disabled = false;
    event.currentTarget.textContent = "测试连接";
    toast("连接测试成功（UI 模拟）");
  });
  $("#saveProvider")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "保存中…";
    await delay(620);
    event.currentTarget.disabled = false;
    event.currentTarget.textContent = "保存并设为当前";
    providers.forEach((provider) => { provider.tone = ""; if (provider.id === selectedProvider) { provider.state = "当前使用"; provider.tone = "current"; } });
    renderList();
    toast("已保存并切换当前服务（UI 模拟）");
  });
  $("#setCurrentProvider")?.addEventListener("click", () => toast("Codex 已是当前服务"));
  $("#reloginProvider")?.addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "等待浏览器授权…";
    await delay(850);
    event.currentTarget.disabled = false;
    event.currentTarget.textContent = "重新登录";
    toast("Codex 登录成功（UI 模拟）");
  });
  $("#disconnectProvider")?.addEventListener("click", () => confirmAction({ title: "退出知拾专用 Codex 登录？", description: "只清理知拾专用登录，不影响本机其他 Codex 会话。", confirmText: "退出登录", danger: true, onConfirm: () => toast("已退出登录（UI 模拟）") }));
  $("#deleteProvider")?.addEventListener("click", () => selectedProvider === "custom" ? selectProvider("codex") : confirmAction({ title: "删除这个 API 配置？", description: "生产版会同时删除系统凭据库中的密钥。Demo 不写入任何凭据。", confirmText: "删除配置", danger: true, onConfirm: () => toast("配置已删除（UI 模拟）") }));
}

function selectProvider(id) {
  selectedProvider = id;
  renderList();
  renderPanel();
}

function renderList() {
  $("#providerList").innerHTML = providerListMarkup();
  $$("[data-provider]").forEach((button) => button.addEventListener("click", () => selectProvider(button.dataset.provider)));
  $("#addProvider").addEventListener("click", () => selectProvider("custom"));
}

export function setupSettings() {
  renderList();
  renderPanel();
}
