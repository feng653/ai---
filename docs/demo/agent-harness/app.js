(() => {
  const timeline = document.querySelector("#timeline");
  const composer = document.querySelector("#composer");
  const input = document.querySelector("#promptInput");
  const sendButton = document.querySelector("#sendButton");
  const quickActions = document.querySelector("#quickActions");
  const effort = document.querySelector("#reasoningEffort");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const renderer = globalThis.AgentHarnessRenderer.createRenderer(timeline);
  let mode = "auto";

  function setBusy(busy) {
    sendButton.classList.toggle("stop", busy);
    sendButton.innerHTML = busy
      ? '<svg><use href="#i-stop"/></svg><b>停止</b>'
      : '<svg><use href="#i-send"/></svg><b>发送</b>';
    quickActions.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
    modeButtons.forEach((button) => { button.disabled = busy; });
    effort.disabled = busy;
  }

  const runtime = new globalThis.AgentHarnessRuntime.DemoRuntime((event) => {
    renderer.render(event);
    if (event.type === "runComplete" || event.type === "cancelled") setBusy(false);
  });

  function start(text) {
    const prompt = text.trim();
    if (!prompt || runtime.active) return;
    renderer.addMessage("user", prompt);
    input.value = "";
    input.style.height = "auto";
    setBusy(true);
    const plan = globalThis.AgentHarnessDemo.createPlan(prompt, {
      mode,
      reasoning: effort.value,
    });
    void runtime.start(plan);
  }

  globalThis.AgentHarnessDemoData.presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = preset.label;
    button.title = preset.prompt;
    button.addEventListener("click", () => start(preset.prompt));
    quickActions.append(button);
  });

  renderer.reset();

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    if (runtime.active) runtime.cancel();
    else start(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
  });

  modeButtons.forEach((button) => button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    input.placeholder = mode === "chat"
      ? "仅聊天模式：Agent 不会调用任何工具…"
      : "聊天，或让 Agent 查找、总结、修改卡片…";
  }));

  timeline.addEventListener("click", (event) => {
    const button = event.target.closest("[data-approval]");
    if (!button) return;
    void runtime.resolveApproval(button.dataset.approval === "approve");
  });

  document.querySelector("#newConversation").addEventListener("click", () => {
    if (runtime.active && !window.confirm("当前任务仍在运行。停止并开始新对话？")) return;
    if (runtime.active) runtime.cancel();
    renderer.reset();
    input.value = "";
    input.focus();
  });

  const panel = document.querySelector("#agentPanel");
  const reopen = document.querySelector("#agentReopen");
  document.querySelector("#minimizeAgent").addEventListener("click", () => {
    panel.hidden = true;
    reopen.hidden = false;
  });
  reopen.addEventListener("click", () => {
    panel.hidden = false;
    reopen.hidden = true;
    input.focus();
  });
})();
