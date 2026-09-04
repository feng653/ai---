(() => {
const data = window.AgentPrototypeData;
const { batches, exercises, persist, reset, state } = data;
const Page = window.AgentPrototypePageViews;
const Knowledge = window.AgentPrototypeKnowledgeViews;
const Practice = window.AgentPrototypePracticeViews;
const Picker = window.AgentPrototypeSourcePicker;
const Panel = window.AgentPrototypeGenerationPanel;
const Agent = window.AgentPrototypeAgentViews;
const ids = ["pageEyebrow","pageTitle","pageAgentEntry","pageContextTitle","pageContextChips","pageCanvas","practiceCount","generationPanel","generationPanelTitle","generationPanelSubtitle","generationPanelBody","generationPanelClose","agentLauncher","launcherStatus","launcherBadge","agentWindow","taskTitle","taskStatus","taskProgress","agentContext","timeline","agentActions","composerForm","composerInput","stopButton","minimizeButton","newConversationButton","restartButton","resetButton","dialogBackdrop","dialogTitle","dialogDescription","dialogCancel","dialogConfirm","toastRegion"];
const el = Object.fromEntries(ids.map((id)=>[id,document.getElementById(id)]));
let confirmAction = null;

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `${Page.icon("check")}<span>${message}</span>`;
  el.toastRegion.append(item);
  window.setTimeout(()=>item.remove(),2600);
}
function renderPage() {
  const meta = Page.pageMeta(state);
  el.pageEyebrow.textContent = meta[0]; el.pageTitle.textContent = meta[1];
  el.pageAgentEntry.querySelector("span").textContent = meta[2];
  el.pageAgentEntry.dataset.action = meta[3];
  el.pageContextTitle.textContent = meta[4];
  el.pageContextChips.innerHTML = meta[5].map(Page.chip).join("");
  document.querySelectorAll("[data-page]").forEach((button)=>button.classList.toggle("active",button.dataset.page===state.page));
  document.querySelectorAll("[data-journey]").forEach((button)=>button.classList.toggle("active",button.dataset.journey===state.page));
  if (state.view === "source-picker") el.pageCanvas.innerHTML = Picker.render(state);
  else if (state.page === "knowledge") el.pageCanvas.innerHTML = state.view === "knowledge-detail" ? Knowledge.detail(state.selectedCardId) : state.view === "knowledge-editor" ? Knowledge.editor(state.selectedCardId) : state.view === "knowledge-review" ? Knowledge.review(state) : Knowledge.list(state);
  else if (state.page === "mistakes") el.pageCanvas.innerHTML = state.view === "mistake-review" ? Page.mistakeReview() : Page.mistakeDetail();
  else el.pageCanvas.innerHTML = state.view === "practice-review" ? Practice.review(state) : state.view === "practice-filter" ? Practice.statusFilter(state) : state.view === "practice-edit" ? Practice.editor(state) : Practice.batchList(state);
}
function render() { renderPage(); Panel.render(el,state); Agent.render(el,state); persist(); }
function setPage(page) {
  state.page = page;
  state.view = page === "knowledge" ? "knowledge-list" : page === "practice" ? "practice-batches" : "mistake-detail";
  state.manageMode = false; state.panel.open = false;
  render();
}
function openConfig(kind) {
  state.panel = { open:true, kind }; state.page = kind === "mistake" ? "mistakes" : kind;
  if (kind === "knowledge") state.selectedSources.knowledge = [];
  render();
}
function setAgent(patch) { Object.assign(state.agent,patch); render(); }
function openPicker() {
  state.pickerKind = state.panel.kind;
  state.pickerTab = state.pickerKind === "knowledge" ? "mistakes" : "knowledge";
  state.pickerPreviewId = state.pickerTab === "knowledge" ? "K-21" : "E-104";
  state.previousView = state.page === "practice" ? "practice-batches" : state.page === "knowledge" ? "knowledge-list" : "mistake-detail";
  state.view = "source-picker"; state.panel.open = false; render();
}
function submitConfig() {
  const kind = state.panel.kind; state.panel.open = false;
  if (kind === "practice") setAgent({ open:true, task:"生成练习批次", status:"waiting", label:"待批准 1", badge:"1", phase:1 });
  if (kind === "knowledge") setAgent({ open:true, task:"从错题生成知识卡", status:"review", label:"待审核 3", badge:"3", phase:4 });
  if (kind === "mistake") setAgent({ open:true, task:"整理错题 E-104", status:"mistake-review", label:"待审核 1", badge:"1", phase:4 });
}
function askConfirm(title, description, action) {
  el.dialogTitle.textContent = title; el.dialogDescription.textContent = description;
  confirmAction = action; el.dialogBackdrop.hidden = false; el.dialogConfirm.focus();
}
function closeDialog() { el.dialogBackdrop.hidden = true; confirmAction = null; }
function changeStatus(status) {
  const item = exercises[state.flipIndex]; item.status = item.status === status ? "unmarked" : status;
  toast(item.status === "unmarked" ? "已重置为未标记" : `已标记为${item.status === "doubt" ? "有疑问" : "已掌握"}`); render();
}
function handleAction(name) {
  if (["open-mistake-config","open-knowledge-config","open-practice-config"].includes(name)) return openConfig(name.split("-")[1]);
  if (name === "choose-sources") return openPicker();
  if (name === "confirm-sources" || name === "close-picker") { state.view=state.previousView; state.panel.open=true; return render(); }
  if (name === "knowledge-list" || name === "practice-batches" || name === "mistake-detail") { state.view=name; return render(); }
  if (name === "new-knowledge") { state.selectedCardId="new"; state.view="knowledge-editor"; return render(); }
  if (name === "edit-knowledge") { state.view="knowledge-editor"; return render(); }
  if (name === "save-knowledge") { state.view="knowledge-detail"; toast(state.selectedCardId==="new"?"知识卡已保存为待补充":"已保存 revision 5"); return render(); }
  if (name === "preview-editor" || name === "manage-points") return toast(name==="preview-editor"?"已切换预览（原型示意）":"知识点树已打开（原型示意）");
  if (name === "practice-from-card") { state.selectedSources.knowledge=[state.selectedCardId]; return openConfig("practice"); }
  if (name === "delete-knowledge") return askConfirm("永久删除此知识卡？","将删除“导数符号表要覆盖全部区间”及 3 个知识点关联，无法撤销。",()=>{state.view="knowledge-list"; toast("知识卡已永久删除（原型模拟）");});
  if (name === "open-status-filter") { state.view="practice-filter"; return render(); }
  if (name === "toggle-manage") { state.manageMode=!state.manageMode; state.selectedExercises=[]; return render(); }
  if (name === "select-all") { state.selectedExercises=[...batches[0].exerciseIds]; return render(); }
  if (name === "clear-selection") { state.selectedExercises=[]; return render(); }
  if (name === "delete-selected") return askConfirm("永久删除选中练习？",`将永久删除 ${state.selectedExercises.length} 道练习，操作无法撤销。`,()=>{state.selectedExercises=[];state.manageMode=false;toast("选中练习已删除，批次事务已完成");});
  if (name === "delete-batch") return askConfirm("永久删除本批？","将永久删除本批全部练习；成功后自动打开相邻批次。",()=>{state.selectedBatchId="B-05";state.manageMode=false;toast("本批已删除，已打开相邻批次");});
  if (name === "next-batch") { state.selectedBatchId="B-05"; return render(); }
  if (name === "flip-card") { state.flipSide=state.flipSide==="front"?"back":"front"; return render(); }
  if (name === "next-exercise") { state.flipIndex=(state.flipIndex+1)%exercises.length;state.flipSide="front";return render(); }
  if (name === "previous-exercise") { state.flipIndex=Math.max(0,state.flipIndex-1);state.flipSide="front";return render(); }
  if (name === "edit-practice") { state.view="practice-edit"; return render(); }
  if (name === "save-practice") { state.view="practice-review"; toast("练习卡 revision 已保存，掌握状态保持不变"); return render(); }
  if (name === "apply-mistake") { state.view="mistake-detail"; toast("选中建议已进入编辑草稿，尚未写入"); return render(); }
  if (name === "save-proposal") { state.proposalStates[state.proposalIndex]="saved"; const next=state.proposalStates.findIndex((value)=>value==="pending"); if(next>=0)state.proposalIndex=next; else setAgent({status:"completed",label:"已完成",badge:"✓",phase:4}); toast("当前知识卡已保存为新 revision"); return render(); }
  if (name === "reject-proposal") { state.proposalStates[state.proposalIndex]="rejected"; const next=state.proposalStates.findIndex((value)=>value==="pending"); if(next>=0)state.proposalIndex=next; toast("当前提案已拒绝，原卡未改变"); return render(); }
  if (name === "rewrite-proposal") { toast("旧提案已标记 superseded，Agent 将生成新版本"); return setAgent({open:true,task:"重写知识卡提案",status:"review",label:"待审核 3",badge:"3",phase:4}); }
  if (name === "open-knowledge-review") { state.page="knowledge";state.view="knowledge-review";state.agent.open=false;return render(); }
  if (name === "open-mistake-review") { state.page="mistakes";state.view="mistake-review";state.agent.open=false;return render(); }
  if (name === "open-practice-edit-review") { state.page="practice";state.view="practice-edit";state.agent.open=false;return render(); }
  if (name === "approve-plan") return setAgent({status:"running",label:`生成中 2/${state.config.count}`,badge:`2/${state.config.count}`,phase:2});
  if (name === "simulate-validation") return setAgent({status:"repairing",label:"修复中 1/3",badge:"1",phase:3});
  if (name === "complete-run") { setAgent({status:"completed",label:"已完成 · 待查看",badge:"✓",phase:4}); return toast("批次已完成；当前页面与焦点未被打断"); }
  if (name === "repair-limit") return setAgent({status:"failed",label:"失败 · 待处理",badge:"!",phase:3});
  if (name === "retry-run") return openConfig("practice");
  if (name === "abandon-run") return setAgent({task:"",status:"idle",label:"准备就绪",badge:"",phase:0});
  if (name === "adjust-plan") { state.agent.open=false; return openConfig("practice"); }
  if (name === "minimize-agent") { state.agent.open=false; return render(); }
  if (name === "open-completed-batch") { state.page="practice";state.view="practice-batches";state.agent.open=false;return render(); }
  if (name === "agent-edit-knowledge") setAgent({open:true,task:"修改当前知识卡",status:"review",label:"待审核 1",badge:"1",phase:4});
  if (name === "agent-edit-practice") setAgent({open:true,task:"修改当前练习卡",status:"practice-review",label:"待审核 1",badge:"1",phase:4});
}
function handleClick(event) {
  const nav=event.target.closest("[data-page]"); if(nav) return setPage(nav.dataset.page);
  const journey=event.target.closest("[data-journey]"); if(journey) return setPage(journey.dataset.journey);
  const card=event.target.closest("[data-open-knowledge]"); if(card){state.selectedCardId=card.dataset.openKnowledge;state.view="knowledge-detail";return render();}
  const exercise=event.target.closest("[data-exercise-id]"); if(exercise){if(state.manageMode){const id=exercise.dataset.exerciseId;state.selectedExercises=state.selectedExercises.includes(id)?state.selectedExercises.filter(x=>x!==id):[...state.selectedExercises,id];return render();}state.flipIndex=Number(exercise.dataset.exerciseIndex);state.flipSide="front";state.view="practice-review";return render();}
  const status=event.target.closest("[data-set-status]"); if(status){event.stopPropagation();return changeStatus(status.dataset.setStatus);}
  const jump=event.target.closest("[data-jump-exercise]"); if(jump){state.flipIndex=Number(jump.dataset.jumpExercise);state.flipSide="front";return render();}
  const filtered=event.target.closest("[data-filtered-review]"); if(filtered){state.flipIndex=exercises.findIndex(x=>x.id===filtered.dataset.filteredReview);state.view="practice-review";state.flipSide="front";return render();}
  const filter=event.target.closest("[data-status-filter]"); if(filter){state.filterStatus=filter.dataset.statusFilter;return render();}
  const pickerTab=event.target.closest("[data-picker-tab]"); if(pickerTab){state.pickerTab=pickerTab.dataset.pickerTab;state.pickerPreviewId=state.pickerTab==="knowledge"?"K-21":"E-104";return render();}
  const proposal=event.target.closest("[data-proposal-index]"); if(proposal){state.proposalIndex=Number(proposal.dataset.proposalIndex);return render();}
  const preview=event.target.closest("[data-preview-source]"); if(preview&&!event.target.closest("[data-select-source]")){state.pickerPreviewId=preview.dataset.previewSource;return render();}
  const action=event.target.closest("[data-action]"); if(action) handleAction(action.dataset.action);
}
document.addEventListener("click",handleClick);
document.addEventListener("change",(event)=>{const source=event.target.closest("[data-select-source]");if(source){const list=state.pickerTab==="knowledge"?state.selectedSources.knowledge:state.selectedSources.mistakes;const id=source.dataset.selectSource;if(source.checked&&!list.includes(id))list.push(id);if(!source.checked)list.splice(list.indexOf(id),1);return render();}const filter=event.target.closest("[data-knowledge-filter]");if(filter){state.knowledgeFilters[filter.dataset.knowledgeFilter]=filter.value;return render();}const input=event.target.closest("[data-config-input]");if(input){state.config[input.dataset.configInput]=input.type==="number"?Number(input.value):input.value;persist();}});
document.addEventListener("input",(event)=>{const filter=event.target.closest('[data-knowledge-filter="text"]');if(filter){state.knowledgeFilters.text=filter.value;render();const next=document.querySelector('[data-knowledge-filter="text"]');next.focus();next.setSelectionRange(filter.value.length,filter.value.length);}});
el.generationPanelBody.addEventListener("submit",(event)=>{event.preventDefault();submitConfig();});
el.generationPanelBody.addEventListener("click",(event)=>{const option=event.target.closest("[data-config-option]");if(option){state.config[option.dataset.configOption]=option.dataset.configValue;render();}});
el.agentLauncher.addEventListener("click",()=>setAgent({open:true})); el.minimizeButton.addEventListener("click",()=>setAgent({open:false}));
el.newConversationButton.addEventListener("click",()=>askConfirm("创建新对话？","当前任务状态会被清空，已保存卡片不受影响。",()=>{Object.assign(state.agent,{open:true,task:"",status:"idle",label:"准备就绪",badge:"",phase:0});toast("已创建新对话");}));
el.generationPanelClose.addEventListener("click",()=>{state.panel.open=false;render();});
el.resetButton.addEventListener("click",()=>{reset();render();toast("原型已重置");}); el.restartButton.addEventListener("click",()=>toast("任务状态已从本地记录恢复"));
el.dialogCancel.addEventListener("click",closeDialog); el.dialogConfirm.addEventListener("click",()=>{const action=confirmAction;closeDialog();action?.();render();});
el.composerForm.addEventListener("submit",(event)=>{event.preventDefault();if(!el.composerInput.value.trim())return;toast("补充要求已加入当前任务");el.composerInput.value="";});
document.addEventListener("keydown",(event)=>{if((event.key==="Enter"||event.key===" ")&&event.target.matches(".flip-card")){event.preventDefault();handleAction("flip-card");}if(event.key==="Escape"&&!el.dialogBackdrop.hidden)closeDialog();});
render();
})();
