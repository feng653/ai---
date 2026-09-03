globalThis.AgentHarnessRenderer = (() => {
  const toolIcon = '<svg><use href="#i-tool"/></svg>';
  const shieldIcon = '<svg><use href="#i-shield"/></svg>';

  function createRenderer(timeline) {
    const runBlocks = new Map();

    function scroll() {
      timeline.scrollTop = timeline.scrollHeight;
    }

    function addMessage(role, text) {
      const article = document.createElement("article");
      article.className = `message ${role}`;
      article.innerHTML = `<span class="avatar">${role === "user" ? "你" : "AI"}</span><div class="message-copy"><small>${role === "user" ? "你" : "知拾 Agent"}</small><div class="bubble"></div></div>`;
      article.querySelector(".bubble").textContent = text;
      timeline.append(article);
      scroll();
      return article;
    }

    function createRun(event) {
      const block = document.createElement("section");
      block.className = "run-block";
      block.dataset.runId = event.runId;
      block.innerHTML = '<div class="run-status"><span class="thinking-dots"><i></i><i></i><i></i></span><span>正在启动 Agent run</span><b>运行中</b></div>';
      timeline.append(block);
      runBlocks.set(event.runId, block);
      scroll();
    }

    function updateStatus(event) {
      const block = runBlocks.get(event.runId);
      if (!block) return;
      block.querySelector(".run-status > span:nth-child(2)").textContent = event.label;
      scroll();
    }

    function addSummary(event) {
      const block = runBlocks.get(event.runId);
      if (!block) return;
      const summary = document.createElement("div");
      summary.className = "decision-summary";
      summary.innerHTML = "<strong>决策摘要</strong><span></span>";
      summary.querySelector("span").textContent = event.text;
      block.append(summary);
      scroll();
    }

    function addTool(event) {
      const block = runBlocks.get(event.runId);
      if (!block) return;
      const item = document.createElement("div");
      item.className = "tool-event";
      item.dataset.callId = event.callId;
      item.innerHTML = `<span class="tool-icon">${toolIcon}</span><div><strong></strong><small></small></div><span class="tool-state">执行中</span>`;
      item.querySelector("strong").textContent = event.name;
      item.querySelector("small").textContent = event.args;
      block.append(item);
      scroll();
    }

    function finishTool(event) {
      const block = runBlocks.get(event.runId);
      const item = block?.querySelector(`[data-call-id="${event.callId}"]`);
      if (!item) return;
      item.classList.add("done");
      item.querySelector("small").textContent = event.result;
      item.querySelector(".tool-state").textContent = "完成";
      scroll();
    }

    function addApproval(event) {
      const card = document.createElement("section");
      card.className = "approval-card";
      card.dataset.approvalId = event.approvalId;
      card.innerHTML = `<header><span>${shieldIcon}</span><div><strong>需要你的批准</strong><small></small></div><b class="approval-result"></b></header><div class="approval-body"><dl><dt>工具</dt><dd class="approval-tool"></dd><dt>目标</dt><dd class="approval-target"></dd><dt>影响</dt><dd class="approval-impact"></dd><dt>并发版本</dt><dd class="approval-revision"></dd></dl></div><footer><button data-approval="reject" type="button">拒绝</button><button class="approve" data-approval="approve" type="button">仅本次允许</button></footer>`;
      card.querySelector("header small").textContent = "Agent 已挂起，批准前不会产生副作用";
      card.querySelector(".approval-tool").textContent = event.name;
      card.querySelector(".approval-target").textContent = event.target;
      card.querySelector(".approval-impact").textContent = event.impact;
      card.querySelector(".approval-revision").textContent = `revision ${event.revision}`;
      timeline.append(card);
      scroll();
    }

    function resolveApproval(event) {
      const card = timeline.querySelector(`[data-approval-id="${event.approvalId}"]`);
      if (!card) return;
      card.classList.add("resolved");
      card.querySelector("footer").hidden = true;
      const label = card.querySelector(".approval-result");
      label.textContent = event.approved ? "已批准" : "已拒绝";
      label.style.color = event.approved ? "var(--brand)" : "var(--red)";
    }

    function endRun(event, cancelled = false) {
      const block = runBlocks.get(event.runId);
      if (block) {
        block.querySelector(".thinking-dots")?.remove();
        block.querySelector(".run-status b").textContent = cancelled ? "已取消" : "已完成";
        block.querySelector(".run-status > span:first-of-type").textContent = cancelled ? "运行已由用户停止" : "Agent run 已完成";
      }
      if (cancelled) {
        timeline.querySelectorAll(".approval-card:not(.resolved)").forEach((card) => {
          card.classList.add("resolved");
          card.querySelector("footer").hidden = true;
          const label = card.querySelector(".approval-result");
          label.textContent = "已取消";
          label.style.color = "var(--red)";
        });
        const end = document.createElement("p");
        end.className = "run-end";
        end.textContent = "已停止，不会继续调用工具。";
        timeline.append(end);
      }
      scroll();
    }

    function render(event) {
      const actions = {
        runStart: createRun,
        status: updateStatus,
        summary: addSummary,
        toolStart: addTool,
        toolComplete: finishTool,
        approval: addApproval,
        approvalResolved: resolveApproval,
        runComplete: (value) => endRun(value, false),
        cancelled: (value) => endRun(value, true),
      };
      if (event.type === "message") addMessage("agent", event.text);
      else actions[event.type]?.(event);
    }

    function reset() {
      timeline.replaceChildren();
      runBlocks.clear();
      addMessage("agent", "你好，我是知拾 Agent。你可以直接和我聊天，也可以让我查找、读取或修改卡片。需要写入时，我会先暂停并请求你的批准。");
    }

    return { addMessage, render, reset };
  }

  return { createRenderer };
})();
