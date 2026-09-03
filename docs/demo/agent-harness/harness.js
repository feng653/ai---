globalThis.AgentHarnessDemo = (() => {
  let sequence = 0;
  const nextId = (prefix) => `${prefix}-${++sequence}`;
  const event = (type, fields = {}, delay = 360) => ({ type, delay, ...fields });
  const tool = (name, args, result, delay = 500) => {
    const callId = nextId("call");
    return [
      event("toolStart", { callId, name, args }, 230),
      event("toolComplete", { callId, name, result }, delay),
    ];
  };

  function intentOf(text) {
    if (/删除|移除/.test(text)) return "delete";
    if (/修改|更新|改得|改成|补充/.test(text)) return "update";
    if (/查找|搜索|找出|总结.*错题|有哪些.*错题/.test(text)) return "search";
    return "chat";
  }

  function chatReply(text) {
    if (/你好|介绍.*能做|你能做什么/.test(text)) {
      return "你好，我是知拾 Agent。我既可以直接陪你讨论学习问题，也能在自动模式下查找卡片、读取详情，并在你批准后修改或删除内容。";
    }
    if (/工具/.test(text)) {
      return "本轮可使用卡片搜索、详情读取、更新、删除和知识点搜索工具。读取会自动执行，写入前一定会请你确认。";
    }
    if (/单调性/.test(text)) {
      return "判断函数单调性时，先明确研究区间，再结合导数符号或函数图像判断。二次函数还要比较对称轴与区间端点的位置。";
    }
    return `我理解你的问题是：“${text}”。这是本地 Harness 交互演示；普通聊天会直接回答，不会为了展示而强行调用工具。`;
  }

  function chatPlan(text, config) {
    const blocked = config.mode === "chat" && intentOf(text) !== "chat";
    const reply = blocked
      ? "当前是“仅聊天”模式，工具已被运行时禁用。我可以讨论如何处理，但不会读取或修改卡片。切换到“自动”后再发送即可执行。"
      : chatReply(text);
    return [
      event("status", { label: `${config.reasoningLabel} · 判断是否需要工具` }, 220),
      event("summary", { text: blocked ? "检测到任务需要工具，但本轮策略禁止工具调用。" : "这个问题可以直接回答，不需要调用工具。" }, 300),
      event("message", { text: reply }, 420),
    ];
  }

  function searchPlan(config) {
    const card = globalThis.AgentHarnessDemoData.cards.monotonicity;
    return [
      event("status", { label: `${config.reasoningLabel} · 规划检索步骤` }, 220),
      event("summary", { text: "先按知识点搜索候选卡片，再读取命中项的完整内容，最后只基于工具结果总结。" }, 330),
      ...tool("cards.search", "query: 函数单调性", `命中 1 张：${card.id}`),
      event("status", { label: "正在读取命中卡片" }, 170),
      ...tool("cards.get", `id: ${card.id}`, `已读取 revision ${card.revision} 与错因、解法`),
      event("message", { text: `找到 1 张相关错题：\n\n《${card.title}》\n\n你的主要问题是${card.reason}建议以后先标出对称轴，再把它与区间端点比较后分类讨论。` }, 520),
    ];
  }

  function mutationPlan(config, action) {
    const deleting = action === "delete";
    const card = deleting
      ? globalThis.AgentHarnessDemoData.cards.friction
      : globalThis.AgentHarnessDemoData.cards.monotonicity;
    const writeName = deleting ? "cards.delete" : "cards.update";
    const change = deleting ? "删除整张卡片及其本地关联" : "仅更新“解题过程”字段";
    const approvalId = nextId("approval");
    const callId = nextId("call");
    return {
      beforeApproval: [
        event("status", { label: `${config.reasoningLabel} · 核对目标与当前版本` }, 220),
        event("summary", { text: "写操作不能直接执行。先搜索并读取当前版本，再提交影响范围明确的批准请求。" }, 330),
        ...tool("cards.search", `query: ${deleting ? "摩擦力" : "函数单调性"}`, `命中 ${card.id}`),
        ...tool("cards.get", `id: ${card.id}`, `已读取 revision ${card.revision}`),
        event("approval", {
          approvalId,
          callId,
          name: writeName,
          target: card.title,
          impact: change,
          revision: card.revision,
        }, 260),
      ],
      approved: [
        event("status", { label: "批准已确认，正在执行写入" }, 180),
        event("toolStart", { callId, name: writeName, args: `id: ${card.id} · revision: ${card.revision}` }, 220),
        event("toolComplete", {
          callId,
          name: writeName,
          result: deleting ? "删除完成 · 幂等键已记录" : `更新完成 · revision ${card.revision + 1}`,
        }, 560),
        event("message", { text: deleting ? "卡片已删除。本次写操作只执行了一次，并保留了批准与工具记录。" : "已只更新这张卡片的“解题过程”，其他字段保持不变。新版本为 revision 5。" }, 420),
      ],
      rejected: [
        event("summary", { text: "用户拒绝了写操作，不再尝试其他修改路径。" }, 220),
        event("message", { text: deleting ? "已取消删除，没有修改任何数据。" : "已拒绝更新，卡片仍保持原样。" }, 360),
      ],
    };
  }

  function createPlan(text, config = {}) {
    const normalized = text.trim();
    const mode = config.mode === "chat" ? "chat" : "auto";
    const effort = ["low", "medium", "high"].includes(config.reasoning) ? config.reasoning : "medium";
    const labels = { low: "快速思考", medium: "标准思考", high: "深入思考" };
    const runConfig = { mode, reasoning: effort, reasoningLabel: labels[effort] };
    const intent = intentOf(normalized);
    const runId = nextId("run");
    if (mode === "chat" || intent === "chat") {
      return { runId, intent, beforeApproval: chatPlan(normalized, runConfig), approved: [], rejected: [] };
    }
    if (intent === "search") {
      return { runId, intent, beforeApproval: searchPlan(runConfig), approved: [], rejected: [] };
    }
    return { runId, intent, ...mutationPlan(runConfig, intent) };
  }

  return { createPlan, intentOf };
})();
