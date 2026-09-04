(() => {
const { knowledgeCards, mistakes } = window.AgentPrototypeData;
const { escapeHtml, icon } = window.AgentPrototypePageViews;
function option(key, value, selected, label) { return `<button type="button" data-config-option="${key}" data-config-value="${value}" aria-pressed="${selected}">${label}</button>`; }
function sourceSummary(state) {
  const k = state.selectedSources.knowledge.length;
  const m = state.selectedSources.mistakes.length;
  const text = state.panel.kind === "knowledge" ? `${m} 道错题` : `${k} 张知识卡 · ${m} 道错题`;
  return `<div class="source-summary"><div><span>本次明确来源</span><strong>${text}</strong><small>不会自动加入同知识点的其他卡片</small></div><button type="button" data-action="choose-sources">选择来源</button></div>`;
}
function knowledgeForm(state) {
  return `${sourceSummary(state)}<div class="control-grid"><div class="control-group"><span class="control-label">生成数量</span><div class="flat-options">${option("knowledgeCount","auto",state.config.knowledgeCount==="auto","自动拆分")}${option("knowledgeCount","exact",state.config.knowledgeCount==="exact","指定数量")}</div></div><label class="control-group"><span class="control-label">最多卡片</span><input class="number-input" type="number" min="1" max="10" value="${state.config.maxCards}" data-config-input="maxCards"></label></div><p class="panel-note">Agent 会在计划中说明拆分数量和理由。每张提案在主内容区逐卡审核，原错题始终保留。</p>${prompt(state)}${submit("生成知识卡提案")}`;
}
function practiceForm(state) {
  const total = state.selectedSources.knowledge.length + state.selectedSources.mistakes.length;
  return `${sourceSummary(state)}<div class="control-grid"><label class="control-group"><span class="control-label">题目数量</span><input class="number-input" type="number" min="1" max="20" value="${state.config.count}" data-config-input="count"></label><label class="control-group"><span class="control-label">模板</span><select data-config-input="template"><option value="concept">概念辨析</option><option value="calculation">计算强化</option><option value="mixed">混合练习</option></select></label></div><div class="control-group"><span class="control-label">难度</span><div class="flat-options three">${option("difficulty","basic",state.config.difficulty==="basic","基础")}${option("difficulty","medium",state.config.difficulty==="medium","中等")}${option("difficulty","advanced",state.config.difficulty==="advanced","进阶")}</div></div><p class="panel-note">${total ? "可只选知识卡、只选错题或混合选择。" : "至少选择一张具体卡片后才能提交。"} 练习只关联已有知识点。</p>${prompt(state)}${submit("提交批次计划", total === 0)}`;
}
function mistakeForm(state) {
  return `<div class="source-summary"><div><span>当前错题</span><strong>E-104 · revision 7</strong><small>只读取当前错题，不扩展同知识点内容</small></div></div><div class="control-group"><span class="control-label">建议范围</span><div class="flat-options"><button type="button" aria-pressed="true">只补全缺失项</button><button type="button" aria-pressed="false">重新整理全部</button></div></div><p class="panel-note">整理错题不会同时创建知识卡。保存后可另行启动“基于此错题生成知识卡”。</p>${prompt(state)}${submit("生成字段建议")}`;
}
function prompt(state) { return `<label class="control-group"><span class="control-label">自定义提示词</span><textarea data-config-input="prompt" placeholder="补充本次输出要求">${escapeHtml(state.config.prompt)}</textarea><small>只影响本次任务；结构化规则和写入权限不会被覆盖。</small></label>`; }
function submit(label, disabled=false) { return `<div class="panel-submit"><span>${icon("shield")}提交后才调用 Agent</span><button type="submit" ${disabled?"disabled":""}>${label}${icon("chevron")}</button></div>`; }
function render(elements, state) {
  const titles = { mistake:"错题整理设置", knowledge:"知识卡生成设置", practice:"练习批次设置" };
  elements.generationPanel.hidden = !state.panel.open;
  elements.generationPanelTitle.textContent = titles[state.panel.kind];
  elements.generationPanelSubtitle.textContent = "独立平面小窗 · 由同一 Agent 任务管理";
  const view = { mistake:mistakeForm, knowledge:knowledgeForm, practice:practiceForm }[state.panel.kind];
  elements.generationPanelBody.innerHTML = `<form>${view(state)}</form>`;
}
window.AgentPrototypeGenerationPanel = { render };
})();
