(() => {
const { action, escapeHtml, icon } = window.AgentPrototypePageViews;

function photoList(photos) {
  if (!photos.length) return `<button class="photo-drop empty" type="button" data-action="add-capture-photo"><span>${icon("upload")}</span><strong>选择或拖入错题照片</strong><small>PNG、JPG/JPEG、WebP · 单张不超过 15MB</small></button>`;
  return `<div class="photo-list">${photos.map((photo, index) => `<article class="photo-item">
    <div class="photo-thumb">${icon("photo")}<span>${index + 1}</span></div>
    <div><strong>${escapeHtml(photo.name)}</strong><small>${escapeHtml(photo.size)} · 已完成裁剪</small></div>
    <div class="photo-controls" aria-label="调整第 ${index + 1} 张图片">
      <button type="button" data-photo-action="up" data-photo-id="${photo.id}" ${index === 0 ? "disabled" : ""}>上移</button>
      <button type="button" data-photo-action="down" data-photo-id="${photo.id}" ${index === photos.length - 1 ? "disabled" : ""}>下移</button>
      <button type="button" data-photo-action="remove" data-photo-id="${photo.id}">删除</button>
    </div>
  </article>`).join("")}</div><button class="photo-add" type="button" data-action="add-capture-photo">${icon("plus")}继续添加照片</button>`;
}

function taskStatus(state, task) {
  if (state.capture.dispatching) return `<section class="capture-task dispatching" role="status" aria-atomic="true"><span>${icon("refresh")}</span><div><strong>正在保存草稿并派发任务</strong><p>按钮已锁定；相同草稿 revision 不会重复创建任务。</p></div></section>`;
  if (!task) return "";
  const copy = {
    queued: ["已排队", `前方 ${task.queuePosition || 1} 项；草稿和照片已安全保留。`],
    running: ["AI 正在整理", `正在读取派发时的草稿 revision ${task.draftRevision}；之后的编辑不会混入本轮。`],
    needs_input: ["需要你补充", "图片里可能有多道题，请确认只整理哪一道或哪些小问。"],
    waiting_review: ["整理建议待审核", "AI 尚未写入卡片；请逐字段决定是否应用到当前草稿。"],
    interrupted: ["任务已中断", "照片与来源快照仍在，可在 Agent 中使用同一输入重试。"],
    failed: ["派发或运行失败", "草稿和照片未丢失，可查看原因并重试。"],
    cancelled: ["任务已取消", "只取消任务；创建页草稿和原始照片仍保留。"],
    completed: ["建议已应用", "结果已进入编辑草稿；还需明确保存才会成为正式错题卡。"],
  }[task.status] || ["任务状态已更新", "可在 Agent 中查看完整记录。"];
  const primary = task.status === "waiting_review" ? action("审核整理结果", "open-mistake-review", "primary") : action("在 Agent 中查看", "open-current-task");
  return `<section class="capture-task ${task.status}" role="status" aria-atomic="true"><span>${icon(task.status === "failed" || task.status === "interrupted" ? "alert" : task.status === "waiting_review" || task.status === "completed" ? "check" : "clock")}</span><div><strong>${copy[0]}</strong><p>${copy[1]}</p><small>任务 ${task.id} · 快照 ${escapeHtml(task.snapshotAt)}</small></div>${primary}</section>`;
}

function proposalEditor(state) {
  if (!state.capture.proposalApplied) return "";
  return `<section class="capture-fields"><header><div><span class="section-kicker">EDITABLE DRAFT</span><h3>已应用的编辑草稿</h3></div><span>尚未正式保存</span></header>
    <label>题目<textarea>已知函数 f(x)=x³−3x，求函数的单调区间。</textarea></label>
    <label>我的答案<textarea>在 (−∞,−1) 和 (1,+∞) 上递增。</textarea></label>
    <div class="two-fields"><label>第一处错误<textarea>遗漏了 (−1,1) 上的递减区间。</textarea></label><label>错误原因<textarea>把“求单调区间”缩减成了“求递增区间”。</textarea></label></div>
    <footer><span>保存成功后才创建正式 revision，AI 不会代你完成这一步。</span>${action("保存错题卡", "save-capture", "primary")}</footer>
  </section>`;
}

function render(state) {
  const task = state.tasks.find((item) => item.id === state.capture.taskId);
  if (state.capture.saved) return `<section class="capture-success"><span>${icon("check")}</span><div><span class="section-kicker">SAVED · E-118</span><h2>错题卡已正式保存</h2><p>原图、结构化字段和来源 revision 已绑定。下一步可在 Agent 中选择它生成知识卡或练习。</p></div>${action("打开错题卡", "mistake-detail", "primary")}</section>`;
  const busy = state.capture.dispatching || Boolean(task);
  return `<div class="capture-intro"><div><span class="section-kicker">PHOTO INTAKE · ${state.capture.draftId}</span><h2>先保住照片，再决定怎样整理</h2><p>创建页只有一个 AI 业务动作：直接保存当前快照并派发，不会打开另一层设置，也不会自动保存正式卡片。</p></div><ol><li class="done"><span>1</span>添加照片</li><li class="${task ? "done" : "active"}"><span>2</span>派发整理</li><li class="${state.capture.proposalApplied ? "active" : ""}"><span>3</span>审核并保存</li></ol></div>
  ${taskStatus(state, task)}
  <div class="capture-grid">
    <section class="capture-panel" data-capture-drop><header><div><h3>错题照片</h3><p>多张图片默认属于同一道题，并按当前顺序送入任务。</p></div><span>${state.capture.photos.length} 张</span></header>${photoList(state.capture.photos)}</section>
    <section class="capture-panel capture-instructions"><header><div><h3>本次整理范围</h3><p>填写题号或小问能避免 AI 整理错题。</p></div><span>${escapeHtml(state.capture.draftStatus)}</span></header>
      <label>题号 / 小问范围<input data-capture-input="scope" value="${escapeHtml(state.capture.scope)}" placeholder="例如：第 44 题（2）"></label>
      <label>补充要求（可选）<textarea data-capture-input="requirements" maxlength="500" placeholder="例如：保留我的手写作答">${escapeHtml(state.capture.requirements)}</textarea><small>只影响下一次派发；任务开始后的修改不会追写到旧快照。</small></label>
      <div class="capture-actions">${action(state.capture.dispatching ? "正在派发…" : task ? "任务已派发" : "AI 整理这道错题", "deploy-photo", "primary", busy || !state.capture.photos.length ? "disabled" : "")}${action("仅保存草稿", "save-capture-draft")}</div>
      <p class="dispatch-note">一次点击会暂存草稿、冻结照片顺序并创建任务；AI 只生成建议。</p>
      ${!task && !state.capture.dispatching ? `<button class="prototype-branch" type="button" data-action="deploy-photo-queued">原型分支：模拟执行器忙时派发</button>` : ""}
    </section>
  </div>${proposalEditor(state)}`;
}

window.AgentPrototypeCaptureView = { render };
})();
