(() => {
const data = window.AgentPrototypeData;
const { batches, exercises, persist, reset, state } = data;
const Page = window.AgentPrototypePageViews;
const Capture = window.AgentPrototypeCaptureView;
const Knowledge = window.AgentPrototypeKnowledgeViews;
const Practice = window.AgentPrototypePracticeViews;
const Picker = window.AgentPrototypeSourcePicker;
const Agent = window.AgentPrototypeAgentViews;
const ids = ["pageEyebrow", "pageTitle", "pageContextTitle", "pageContextChips", "pageContextHelp", "pageCanvas", "headerSearch", "practiceCount", "agentLauncher", "launcherStatus", "launcherBadge", "agentWindow", "taskTitle", "taskStatus", "taskProgress", "agentContext", "timeline", "agentActions", "composerForm", "composerInput", "stopButton", "minimizeButton", "newConversationButton", "restartButton", "resetButton", "dialogBackdrop", "dialogTitle", "dialogDescription", "dialogCancel", "dialogConfirm", "capturePhotoInput", "agentPhotoInput", "toastRegion"];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
let confirmAction = null;
let dispatchToken = 0;
const terminal = new Set(["completed", "cancelled"]);
const { toast, nowLabel, getTask, isExecuting, reindexQueue, startNextTask, setTaskStatus, renderPage, taskInput, updateCapturePhoto, addFiles } = window.AgentPrototypeRuntime({ state, Page, Capture, Knowledge, Practice, Picker, el, render });

function render() { renderPage(); Agent.render(el, state); persist(); }
function setPage(page) {
  state.page = page;
  state.view = { capture: "capture-new", mistakes: "mistake-detail", knowledge: "knowledge-list", practice: "practice-batches" }[page];
  state.manageMode = false;
  render();
}
function runJourney(name) {
  state.journey = name;
  if (name === "capture") { state.agent.open = false; return setPage("capture"); }
  if (name === "agent-photo") {
    state.page = "capture"; state.view = "capture-new";
    Object.assign(state.agent, { open: true, view: "draft", taskId: "", draftKind: "photo" });
    if (!state.agent.draftAttachments.length) state.agent.draftAttachments = [{ id: "A-DEMO", name: "课堂练习_44.jpg", size: "2.1 MB", bytes: 2202009 }];
    return render();
  }
  state.page = name; state.view = name === "knowledge" ? "knowledge-list" : "practice-batches";
  Object.assign(state.agent, { open: true, view: "draft", taskId: "", draftKind: name });
  render();
}
function openAgentTask(task) {
  if (!task) return;
  Object.assign(state.agent, { open: true, view: "task", taskId: task.id });
  render();
}
function openAgent() {
  const priority = ["waiting_review", "needs_input", "failed", "interrupted", "running", "repairing", "queued"];
  const pending = state.tasks.filter((task) => !terminal.has(task.status));
  if (pending.length === 1) return openAgentTask(pending[0]);
  const task = priority.map((status) => pending.find((item) => item.status === status)).find(Boolean);
  if (task && pending.length === 1) return openAgentTask(task);
  Object.assign(state.agent, { open: true, view: "home", taskId: "" });
  render();
}
function createTask(kind, origin, options = {}) {
  const input = taskInput(kind, origin);
  const key = origin === "capture" ? `${state.capture.draftId}:${state.capture.draftRevision}:${kind}` : `${kind}:${state.nextTaskNumber}:${input.sourceLabel}`;
  const existing = state.tasks.find((task) => task.idempotencyKey === key);
  if (existing) return existing;
  const id = `T-${String(state.nextTaskNumber++).padStart(3, "0")}`;
  const busy = state.tasks.some(isExecuting);
  const status = kind === "practice" ? "waiting_plan" : busy || options.forceQueued ? "queued" : "running";
  const task = {
    id, idempotencyKey: key, kind, origin, title: { photo: "整理错题照片", knowledge: "生成知识卡", practice: "生成练习批次" }[kind],
    status, queuePosition: 0, snapshotAt: nowLabel(), updatedAt: nowLabel(), draftId: origin === "capture" ? state.capture.draftId : "",
    draftRevision: origin === "capture" ? state.capture.draftRevision : 1, attempt: 1, ...input,
  };
  state.tasks.push(task); reindexQueue();
  if (origin === "capture") state.capture.taskId = id;
  return task;
}
function deployCapture(simulateBusy = false) {
  if (state.capture.dispatching) return;
  const existing = getTask(state.capture.taskId);
  if (existing) return toast(`已定位原任务 ${existing.id}，没有重复派发。`);
  if (!state.capture.photos.length) return toast("请先添加至少一张有效照片。", "error");
  state.capture.dispatching = true;
  const token = ++dispatchToken;
  render();
  window.setTimeout(() => {
    if (token !== dispatchToken || !state.capture.dispatching) return;
    if (simulateBusy && !state.tasks.some(isExecuting)) {
      const blocker = createTask("knowledge", "agent");
      blocker.summary = "正在处理上一项知识卡任务（队列演示）";
    }
    state.capture.draftStatus = "草稿与图片已安全暂存";
    const task = createTask("photo", "capture");
    state.capture.dispatching = false;
    render();
    toast(task.status === "queued" ? `${task.id} 已排队，前方 ${task.queuePosition} 项。` : `${task.id} 已开始；可继续当前学习。`);
  }, 420);
}
function openPicker() {
  state.previousPage = state.page; state.previousView = state.view;
  state.pickerKind = state.agent.draftKind;
  state.pickerTab = state.pickerKind === "knowledge" ? "mistakes" : "knowledge";
  state.pickerPreviewId = state.pickerTab === "knowledge" ? "K-21" : "E-104";
  state.pickerDraft = { knowledge: [...state.selectedSources.knowledge], mistakes: [...state.selectedSources.mistakes] };
  if (state.pickerKind === "knowledge") state.pickerDraft.knowledge = [];
  state.view = "source-picker"; state.agent.open = false; render();
}
function closePicker(commit) {
  if (commit && state.pickerDraft) state.selectedSources = { knowledge: [...state.pickerDraft.knowledge], mistakes: [...state.pickerDraft.mistakes] };
  state.pickerDraft = null; state.page = state.previousPage; state.view = state.previousView;
  Object.assign(state.agent, { open: true, view: "draft" });
  render(); toast(commit ? "来源已提交到任务草稿。" : "已取消，正式来源没有变化。");
}
function askConfirm(title, description, action) {
  el.dialogTitle.textContent = title; el.dialogDescription.textContent = description;
  confirmAction = action; el.dialogBackdrop.hidden = false; el.dialogConfirm.focus();
}
function closeDialog() { el.dialogBackdrop.hidden = true; confirmAction = null; }
function changeStatus(status) {
  const item = exercises[state.flipIndex]; item.status = item.status === status ? "unmarked" : status;
  toast(item.status === "unmarked" ? "已重置为未标记。" : `已标记为${item.status === "doubt" ? "有疑问" : "已掌握"}。`); render();
}
function finishAnalysis(task) {
  setTaskStatus(task, "waiting_review");
  if (task.kind === "photo") {
    state.capture.taskId = task.id; state.capture.proposalApplied = false; state.capture.saved = false;
    if (task.origin === "agent") state.capture.photos = task.assetRefs.map((asset) => ({ id: asset.id, name: asset.name, size: "Agent 上传" }));
  }
  render();
}
function handleAction(name) {
  const task = getTask();
  if (name === "capture-new") return setPage("capture");
  if (["knowledge-list", "practice-batches", "mistake-detail"].includes(name)) return setPage(name === "knowledge-list" ? "knowledge" : name === "practice-batches" ? "practice" : "mistakes");
  if (name === "knowledge-detail") { state.page = "knowledge"; state.view = "knowledge-detail"; return render(); }
  if (name === "add-capture-photo") return el.capturePhotoInput.click();
  if (name === "add-agent-photo") return el.agentPhotoInput.click();
  if (name === "save-capture-draft") { state.capture.draftStatus = "刚刚已暂存"; render(); return toast("照片草稿已保存，不会创建 AI 任务。"); }
  if (name === "deploy-photo") return deployCapture(false);
  if (name === "deploy-photo-queued") return deployCapture(true);
  if (name === "open-current-task") return openAgentTask(getTask(state.capture.taskId));
  if (name === "open-mistake-review") { state.page = "capture"; state.view = "mistake-review"; state.agent.open = false; return render(); }
  if (name === "apply-mistake") { state.capture.proposalApplied = true; state.page = "capture"; state.view = "capture-new"; if (getTask(state.capture.taskId)) setTaskStatus(getTask(state.capture.taskId), "completed"); render(); return toast("已采用字段进入编辑草稿；尚未正式保存。"); }
  if (name === "save-capture") { state.capture.saved = true; state.capture.draftStatus = "正式保存成功"; render(); return toast("错题卡 E-118 已创建 revision 1。"); }
  if (name === "choose-sources") return openPicker();
  if (name === "confirm-sources") return closePicker(true);
  if (name === "cancel-sources") return closePicker(false);
  if (name === "agent-home") { Object.assign(state.agent, { view: "home", taskId: "", draftKind: "" }); return render(); }
  if (name === "deploy-agent-task") {
    const kind = state.agent.draftKind; const created = createTask(kind, "agent");
    Object.assign(state.agent, { view: "task", taskId: created.id }); render();
    return toast(kind === "practice" ? "计划已创建，等待批准。" : created.status === "queued" ? "任务已加入队列。" : "任务已开始。");
  }
  if (name === "task-needs-input" && task) { setTaskStatus(task, "needs_input"); render(); return; }
  if (name === "confirm-task-scope" && task) { task.attempt += 1; task.summary = `${task.summary}；已确认指定小问`; task.status = state.tasks.some((item) => item.id !== task.id && isExecuting(item)) ? "queued" : "running"; reindexQueue(); render(); return; }
  if (name === "task-finish-analysis" && task) return finishAnalysis(task);
  if (name === "approve-plan" && task) { task.status = state.tasks.some((item) => item.id !== task.id && isExecuting(item)) ? "queued" : "running"; reindexQueue(); return render(); }
  if (name === "task-repair" && task) { task.status = "repairing"; return render(); }
  if (name === "task-complete" && task) { setTaskStatus(task, "completed"); render(); return toast(task.kind === "practice" ? "练习批次已事务保存。" : "任务已完成。"); }
  if (name === "task-fail" && task) { setTaskStatus(task, "failed"); return render(); }
  if (name === "retry-task" && task) { task.attempt += 1; task.status = state.tasks.some((item) => item.id !== task.id && isExecuting(item)) ? "queued" : "running"; reindexQueue(); return render(); }
  if (name === "cancel-task" && task) { setTaskStatus(task, "cancelled"); render(); return toast("任务已取消；原始草稿与照片仍保留。"); }
  if (name === "edit-current-task" && task) { state.agent.draftKind = task.kind; state.agent.view = "draft"; return render(); }
  if (name === "open-knowledge-review") { state.page = "knowledge"; state.view = "knowledge-review"; state.agent.open = false; return render(); }
  if (name === "open-completed-batch") { state.page = "practice"; state.view = "practice-batches"; state.agent.open = false; return render(); }
  if (name === "new-knowledge") { state.selectedCardId = "new"; state.view = "knowledge-editor"; return render(); }
  if (name === "edit-knowledge") { state.view = "knowledge-editor"; return render(); }
  if (name === "save-knowledge") { state.view = "knowledge-detail"; toast(state.selectedCardId === "new" ? "知识卡已保存为待补充。" : "已保存 revision 5。"); return render(); }
  if (name === "preview-editor" || name === "manage-points") return toast(name === "preview-editor" ? "已切换预览（原型示意）。" : "知识点树已打开（原型示意）。");
  if (name === "delete-knowledge") return askConfirm("永久删除此知识卡？", "将删除这张知识卡及知识点关联，无法撤销。", () => { state.view = "knowledge-list"; toast("知识卡已永久删除（原型模拟）。"); });
  if (name === "open-status-filter") { state.view = "practice-filter"; return render(); }
  if (name === "toggle-manage") { state.manageMode = !state.manageMode; state.selectedExercises = []; return render(); }
  if (name === "select-all") { state.selectedExercises = [...batches[0].exerciseIds]; return render(); }
  if (name === "clear-selection") { state.selectedExercises = []; return render(); }
  if (name === "delete-selected") return askConfirm("永久删除选中练习？", `将永久删除 ${state.selectedExercises.length} 道练习，操作无法撤销。`, () => { state.selectedExercises = []; state.manageMode = false; toast("选中练习已删除。"); });
  if (name === "delete-batch") return askConfirm("永久删除本批？", "将永久删除本批全部练习，操作无法撤销。", () => { state.selectedBatchId = "B-05"; state.manageMode = false; toast("本批已删除，已打开相邻批次。"); });
  if (name === "next-batch") { state.selectedBatchId = "B-05"; return render(); }
  if (name === "flip-card") { state.flipSide = state.flipSide === "front" ? "back" : "front"; return render(); }
  if (name === "next-exercise") { state.flipIndex = (state.flipIndex + 1) % exercises.length; state.flipSide = "front"; return render(); }
  if (name === "previous-exercise") { state.flipIndex = Math.max(0, state.flipIndex - 1); state.flipSide = "front"; return render(); }
  if (name === "edit-practice") { state.view = "practice-edit"; return render(); }
  if (name === "save-practice") { state.view = "practice-review"; toast("练习卡 revision 已保存，掌握状态不变。"); return render(); }
  if (name === "save-proposal" || name === "reject-proposal") {
    state.proposalStates[state.proposalIndex] = name === "save-proposal" ? "saved" : "rejected";
    const next = state.proposalStates.findIndex((value) => value === "pending");
    if (next >= 0) state.proposalIndex = next; else if (task) setTaskStatus(task, "completed");
    toast(name === "save-proposal" ? "当前知识卡已保存为新 revision。" : "当前提案已拒绝，原卡未改变。"); return render();
  }
  if (name === "rewrite-proposal") return toast("旧提案已标记 superseded，新版本会保留来源 revision。");
}
function handleClick(event) {
  const nav = event.target.closest("[data-page]"); if (nav) return setPage(nav.dataset.page);
  const journey = event.target.closest("[data-journey]"); if (journey) return runJourney(journey.dataset.journey);
  const agentTask = event.target.closest("[data-agent-task]"); if (agentTask) { Object.assign(state.agent, { view: "draft", taskId: "", draftKind: agentTask.dataset.agentTask }); return render(); }
  const openTask = event.target.closest("[data-open-task]"); if (openTask) return openAgentTask(getTask(openTask.dataset.openTask));
  const field = event.target.closest("[data-field-choice]"); if (field) { const index = Number(field.dataset.fieldChoice); state.capture.fieldChoices[index] = !state.capture.fieldChoices[index]; return render(); }
  const photoAction = event.target.closest("[data-photo-action]"); if (photoAction) return updateCapturePhoto(photoAction.dataset.photoId, photoAction.dataset.photoAction);
  const removeAgentPhoto = event.target.closest("[data-remove-agent-photo]"); if (removeAgentPhoto) { state.agent.draftAttachments = state.agent.draftAttachments.filter((photo) => photo.id !== removeAgentPhoto.dataset.removeAgentPhoto); return render(); }
  const card = event.target.closest("[data-open-knowledge]"); if (card) { state.selectedCardId = card.dataset.openKnowledge; state.view = "knowledge-detail"; return render(); }
  const exercise = event.target.closest("[data-exercise-id]"); if (exercise) { if (state.manageMode) { const id = exercise.dataset.exerciseId; state.selectedExercises = state.selectedExercises.includes(id) ? state.selectedExercises.filter((item) => item !== id) : [...state.selectedExercises, id]; return render(); } state.flipIndex = Number(exercise.dataset.exerciseIndex); state.flipSide = "front"; state.view = "practice-review"; return render(); }
  const status = event.target.closest("[data-set-status]"); if (status) { event.stopPropagation(); return changeStatus(status.dataset.setStatus); }
  const jump = event.target.closest("[data-jump-exercise]"); if (jump) { state.flipIndex = Number(jump.dataset.jumpExercise); state.flipSide = "front"; return render(); }
  const filtered = event.target.closest("[data-filtered-review]"); if (filtered) { state.flipIndex = exercises.findIndex((item) => item.id === filtered.dataset.filteredReview); state.view = "practice-review"; state.flipSide = "front"; return render(); }
  const filter = event.target.closest("[data-status-filter]"); if (filter) { state.filterStatus = filter.dataset.statusFilter; return render(); }
  const pickerTab = event.target.closest("[data-picker-tab]"); if (pickerTab) { state.pickerTab = pickerTab.dataset.pickerTab; state.pickerPreviewId = state.pickerTab === "knowledge" ? "K-21" : "E-104"; return render(); }
  const proposal = event.target.closest("[data-proposal-index]"); if (proposal) { state.proposalIndex = Number(proposal.dataset.proposalIndex); return render(); }
  const source = event.target.closest("[data-select-source]"); if (source) { const list = state.pickerTab === "knowledge" ? state.pickerDraft.knowledge : state.pickerDraft.mistakes; const id = source.dataset.selectSource; if (list.includes(id)) list.splice(list.indexOf(id), 1); else list.push(id); return render(); }
  const preview = event.target.closest("[data-preview-source]"); if (preview && !event.target.closest("[data-select-source]")) { state.pickerPreviewId = preview.dataset.previewSource; return render(); }
  const action = event.target.closest("[data-action]"); if (action && !action.disabled) handleAction(action.dataset.action);
}
function simulateRestart() {
  const interrupted = state.tasks.filter(isExecuting);
  interrupted.forEach((task) => { task.status = "interrupted"; task.updatedAt = nowLabel(); });
  state.capture.dispatching = false; dispatchToken += 1; reindexQueue(); render();
  toast(interrupted.length ? `${interrupted.length} 个运行任务已恢复为“已中断”；快照仍保留。` : "没有运行任务；队列与待审核状态保持不变。");
}

document.addEventListener("click", handleClick);
document.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-knowledge-filter]"); if (filter) { state.knowledgeFilters[filter.dataset.knowledgeFilter] = filter.value; return render(); }
  const captureInput = event.target.closest("[data-capture-input]"); if (captureInput) { state.capture[captureInput.dataset.captureInput] = captureInput.value; state.capture.draftRevision += 1; return persist(); }
  const agentInput = event.target.closest("[data-agent-draft-input]"); if (agentInput) { state.agent[`draft${agentInput.dataset.agentDraftInput[0].toUpperCase()}${agentInput.dataset.agentDraftInput.slice(1)}`] = agentInput.value; return persist(); }
  const configInput = event.target.closest("[data-config-input]"); if (configInput) { state.config[configInput.dataset.configInput] = configInput.type === "number" ? Number(configInput.value) : configInput.value; persist(); }
});
document.addEventListener("input", (event) => {
  const filter = event.target.closest('[data-knowledge-filter="text"]');
  if (filter) { state.knowledgeFilters.text = filter.value; render(); const next = document.querySelector('[data-knowledge-filter="text"]'); next.focus(); next.setSelectionRange(filter.value.length, filter.value.length); }
});
document.addEventListener("dragover", (event) => { if (event.target.closest("[data-capture-drop]")) event.preventDefault(); });
document.addEventListener("drop", (event) => { if (event.target.closest("[data-capture-drop]")) { event.preventDefault(); addFiles(event.dataTransfer.files, "capture"); } });
el.capturePhotoInput.addEventListener("change", () => { addFiles(el.capturePhotoInput.files, "capture"); el.capturePhotoInput.value = ""; });
el.agentPhotoInput.addEventListener("change", () => { addFiles(el.agentPhotoInput.files, "agent"); el.agentPhotoInput.value = ""; });
el.agentLauncher.addEventListener("click", openAgent);
el.minimizeButton.addEventListener("click", () => { state.agent.open = false; render(); });
el.newConversationButton.addEventListener("click", () => { Object.assign(state.agent, { view: "home", taskId: "", draftKind: "" }); render(); toast("已创建新对话；任务和提案仍在任务记录中。"); });
el.stopButton.addEventListener("click", () => { const task = getTask(); if (!task || !isExecuting(task)) return; task.status = "cancel_requested"; render(); window.setTimeout(() => { if (task.status === "cancel_requested") { setTaskStatus(task, "cancelled"); render(); toast("任务已停止；原始材料仍保留。"); } }, 500); });
el.resetButton.addEventListener("click", () => { dispatchToken += 1; reset(); render(); toast("原型已重置。"); });
el.restartButton.addEventListener("click", simulateRestart);
el.dialogCancel.addEventListener("click", closeDialog);
el.dialogConfirm.addEventListener("click", () => { const action = confirmAction; closeDialog(); action?.(); render(); });
el.composerForm.addEventListener("submit", (event) => { event.preventDefault(); const text = el.composerInput.value.trim(); if (!text) return; toast(getTask() ? "补充内容已记录为当前任务的新版本；不会自动批准写入。" : "已作为普通对话发送；没有创建任务或读取页面。" ); el.composerInput.value = ""; });
document.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.matches(".flip-card")) { event.preventDefault(); handleAction("flip-card"); } if (event.key === "Escape" && !el.dialogBackdrop.hidden) closeDialog(); });
render();
})();
