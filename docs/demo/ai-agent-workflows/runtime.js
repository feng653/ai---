window.AgentPrototypeRuntime = ({ state, Page, Capture, Knowledge, Practice, Picker, el, render }) => {
function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  if (type === "error") item.setAttribute("role", "alert");
  item.innerHTML = `${Page.icon(type === "error" ? "alert" : "check")}<span>${Page.escapeHtml(message)}</span>`;
  el.toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3000);
}
function nowLabel() { return `今天 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`; }
function getTask(id = state.agent.taskId) { return state.tasks.find((item) => item.id === id); }
function isExecuting(task) { return ["running", "repairing", "cancel_requested"].includes(task.status); }
function reindexQueue() { state.tasks.filter((task) => task.status === "queued").forEach((task, index) => { task.queuePosition = index + 1; }); }
function startNextTask() {
  if (state.tasks.some(isExecuting)) return;
  const next = state.tasks.find((task) => task.status === "queued");
  if (next) next.status = "running";
  reindexQueue();
}
function setTaskStatus(task, status) {
  task.status = status;
  task.updatedAt = nowLabel();
  if (!isExecuting(task)) startNextTask();
}
function renderPage() {
  const meta = Page.pageMeta(state);
  el.pageEyebrow.textContent = meta.eyebrow;
  el.pageTitle.textContent = meta.title;
  el.pageContextTitle.textContent = meta.context;
  el.pageContextChips.innerHTML = meta.chips.map(Page.chip).join("");
  el.pageContextHelp.textContent = meta.help;
  el.headerSearch.hidden = !meta.search;
  document.querySelectorAll("[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === state.page));
  document.querySelectorAll("[data-journey]").forEach((button) => button.classList.toggle("active", button.dataset.journey === state.journey));
  if (state.view === "source-picker") el.pageCanvas.innerHTML = Picker.render(state);
  else if (state.page === "capture") el.pageCanvas.innerHTML = state.view === "mistake-review" ? Page.mistakeReview(state) : Capture.render(state);
  else if (state.page === "knowledge") el.pageCanvas.innerHTML = state.view === "knowledge-detail" ? Knowledge.detail(state.selectedCardId) : state.view === "knowledge-editor" ? Knowledge.editor(state.selectedCardId) : state.view === "knowledge-review" ? Knowledge.review(state) : Knowledge.list(state);
  else if (state.page === "mistakes") el.pageCanvas.innerHTML = Page.mistakeDetail(state);
  else el.pageCanvas.innerHTML = state.view === "practice-review" ? Practice.review(state) : state.view === "practice-filter" ? Practice.statusFilter(state) : state.view === "practice-edit" ? Practice.editor(state) : Practice.batchList(state);
}
function taskInput(kind, origin) {
  const fromCapture = origin === "capture";
  const photos = fromCapture ? state.capture.photos : state.agent.draftAttachments;
  const count = kind === "knowledge" ? state.selectedSources.mistakes.length : state.selectedSources.knowledge.length + state.selectedSources.mistakes.length;
  return {
    sourceLabel: kind === "photo" ? `${photos.length} 张${fromCapture ? "草稿照片" : " Agent 附件"}` : `${count} 张明确加入的卡片`,
    scope: kind === "photo" ? (fromCapture ? state.capture.scope : state.agent.draftScope) : "当前明确来源",
    requirements: kind === "photo" ? (fromCapture ? state.capture.requirements : state.agent.draftRequirements) : state.config.prompt,
    summary: kind === "photo" ? `整理${fromCapture ? "创建草稿" : "上传照片"}：${kind === "photo" ? (fromCapture ? state.capture.scope : state.agent.draftScope) : ""}` : kind === "knowledge" ? `从 ${state.selectedSources.mistakes.length} 张错题生成或完善“${state.config.knowledgePoint}”知识卡` : `从 ${count} 张来源生成 ${state.config.count} 道练习`,
    assetRefs: photos.map((photo) => ({ id: photo.id, name: photo.name, role: fromCapture ? "borrowed" : "owned_upload" })),
    sourceRefs: { knowledge: kind === "knowledge" ? [] : [...state.selectedSources.knowledge], mistakes: [...state.selectedSources.mistakes] },
    requestedCount: state.config.count, difficulty: state.config.difficulty, knowledgePoint: state.config.knowledgePoint,
  };
}
function updateCapturePhoto(id, action) {
  const index = state.capture.photos.findIndex((photo) => photo.id === id);
  if (index < 0) return;
  if (action === "remove") state.capture.photos.splice(index, 1);
  if (action === "up" && index > 0) [state.capture.photos[index - 1], state.capture.photos[index]] = [state.capture.photos[index], state.capture.photos[index - 1]];
  if (action === "down" && index < state.capture.photos.length - 1) [state.capture.photos[index + 1], state.capture.photos[index]] = [state.capture.photos[index], state.capture.photos[index + 1]];
  state.capture.draftRevision += 1; render();
}
function addFiles(fileList, target) {
  const files = [...fileList]; const max = target === "agent" ? 3 : 8;
  const list = target === "agent" ? state.agent.draftAttachments : state.capture.photos;
  const allowed = new Set(["image/png", "image/jpeg", "image/webp"]); const limit = 15 * 1024 * 1024;
  for (const file of files) {
    if (list.length >= max) { toast(`本入口最多添加 ${max} 张照片。`, "error"); break; }
    if (!allowed.has(file.type)) { toast(`${file.name} 不是支持的 PNG、JPG/JPEG 或 WebP。`, "error"); continue; }
    if (!file.size || file.size > limit) { toast(`${file.name} 为空或超过单张 15MB。`, "error"); continue; }
    if (target === "capture" && list.reduce((sum, item) => sum + (item.bytes || 0), 0) + file.size > 32 * 1024 * 1024) { toast("当前照片累计超过 Provider 的 32MiB 上限。", "error"); break; }
    list.push({ id: `IMG-${Date.now()}-${list.length}`, name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, bytes: file.size });
  }
  if (target === "capture") state.capture.draftRevision += 1;
  render();
}
return { toast, nowLabel, getTask, isExecuting, reindexQueue, startNextTask, setTaskStatus, renderPage, taskInput, updateCapturePhoto, addFiles };
};
