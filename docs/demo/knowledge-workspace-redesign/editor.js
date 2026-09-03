import { $, $$, icon, toast, confirmAction, closeLayer, delay } from "./ui.js";

let dirty = false;
let draftTimer;
let imageRotation = 0;
const knowledgeTree = {
  "数学": {
    "函数与导数": ["导数与单调性", "函数极值", "切线问题"],
    "圆锥曲线": ["椭圆离心率", "焦点弦"]
  },
  "物理": {
    "力学": ["受力分析", "牛顿第二定律"],
    "动量": ["动量守恒", "碰撞模型"]
  }
};
const pickerState = { subject: "数学", chapter: "函数与导数", point: "导数与单调性" };

function organizerIdle() {
  return `<div class="ai-head"><span class="ai-mark">${icon("spark")}</span><div><strong>AI 整理助手</strong><small>建议需审阅，接受后仍不会自动保存</small></div></div><div class="ai-body"><div class="ai-intro">基于当前题目与图片生成结构化建议。原始输入始终保留，冲突字段会单独标出。</div><button class="button primary ai-start" id="startOrganize" type="button">${icon("spark")}<span>开始整理</span></button></div>`;
}

function organizerRunning() {
  return `<div class="ai-head"><span class="ai-mark">${icon("spark")}</span><div><strong>正在整理</strong><small>request · demo-024</small></div></div><div class="ai-body"><div class="ai-timeline"><div class="ai-step active"><i></i><span>读取题目材料</span></div><div class="ai-step"><i></i><span>分析第一处错误</span></div><div class="ai-step"><i></i><span>组织知识路径</span></div></div></div>`;
}

function organizerReview() {
  return `<div class="ai-head"><span class="ai-mark">${icon("spark")}</span><div><strong>审阅 AI 建议</strong><small>2 项已选择 · 1 项需要确认</small></div></div><div class="ai-body"><div class="suggestions"><label class="suggestion"><input type="checkbox" checked><span><strong>正确解法</strong><p>补全导数符号表与三个区间的单调性。</p></span></label><label class="suggestion"><input type="checkbox" checked><span><strong>错误原因</strong><p>把“列出递增区间”误当成完整回答。</p></span></label><label class="suggestion warning"><input type="checkbox"><span><strong>错误类型</strong><p>建议改为“条件遗漏”，置信度较低。</p></span></label><label class="suggestion warning"><input type="checkbox"><span><strong>并发编辑冲突</strong><p>你在生成期间修改了“我的答案”，默认不覆盖。</p></span></label></div><div class="review-actions"><button class="button quiet" id="rejectSuggestions" type="button">拒绝全部</button><button class="button primary" id="acceptSuggestions" type="button">接受所选</button></div></div>`;
}

function bindOrganizer() {
  $("#startOrganize")?.addEventListener("click", async () => {
    const question = $("#questionInput").value.trim();
    if (!question && $("#imagePreview").hidden) { toast("请先输入题目或添加图片", "warning"); return; }
    const panel = $("#aiOrganizer");
    panel.innerHTML = organizerRunning();
    const steps = $$(".ai-step", panel);
    for (let index = 0; index < steps.length; index += 1) {
      if (index) { steps[index - 1].classList.remove("active"); steps[index - 1].classList.add("done"); steps[index].classList.add("active"); }
      await delay(520);
    }
    steps.at(-1).classList.remove("active");
    steps.at(-1).classList.add("done");
    await delay(240);
    panel.innerHTML = organizerReview();
    bindOrganizer();
  });
  $("#rejectSuggestions")?.addEventListener("click", () => { $("#aiOrganizer").innerHTML = organizerIdle(); bindOrganizer(); toast("已拒绝全部建议"); });
  $("#acceptSuggestions")?.addEventListener("click", () => {
    markDirty();
    $("#aiOrganizer").innerHTML = organizerIdle();
    bindOrganizer();
    toast("2 项建议已进入表单，尚未保存");
  });
}

function openImageEditor() {
  const layer = $("#imageDialog");
  imageRotation = 0;
  layer.innerHTML = `<section class="dialog-card crop-dialog" role="dialog" aria-modal="true" aria-labelledby="cropTitle"><header><span class="dialog-mark">${icon("image")}</span><div><h2 id="cropTitle">整理题目图片</h2><p>旋转并调整裁剪区域，确认后才会加入卡片。</p></div><button class="icon-button" data-image-close type="button" aria-label="关闭图片编辑">${icon("close")}</button></header><div class="crop-stage"><div class="crop-image" id="cropImage">f(x) = x³ − 3x<div class="crop-frame"><i class="crop-handle a"></i><i class="crop-handle b"></i><i class="crop-handle c"></i><i class="crop-handle d"></i></div></div></div><div class="crop-toolbar"><button class="button quiet" data-rotate="-90" type="button">${icon("rotate")}<span>向左旋转</span></button><button class="button quiet" data-rotate="90" type="button">${icon("rotate")}<span>向右旋转</span></button><button class="button quiet" id="resetCrop" type="button">重置</button><span>输出上限 1600 万像素</span></div><footer><button class="button quiet" data-image-cancel type="button">取消</button><button class="button primary" id="confirmImage" type="button">使用图片</button></footer></section>`;
  layer.hidden = false;
  layer.classList.add("open");
  const close = () => closeLayer(layer);
  $("[data-image-close]", layer).addEventListener("click", close);
  $("[data-image-cancel]", layer).addEventListener("click", close);
  $$("[data-rotate]", layer).forEach((button) => button.addEventListener("click", () => {
    imageRotation += Number(button.dataset.rotate);
    $("#cropImage").style.transform = `rotate(${imageRotation}deg) scale(${Math.abs(imageRotation % 180) === 90 ? .72 : 1})`;
  }));
  $("#resetCrop", layer).addEventListener("click", () => { imageRotation = 0; $("#cropImage").style.transform = "none"; });
  $("#confirmImage", layer).addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = "处理中…";
    await delay(460);
    close();
    $("#imageDrop").hidden = true;
    $("#imagePreview").hidden = false;
    markDirty();
    toast("图片已加入卡片（UI 模拟）");
  });
  layer.addEventListener("click", (event) => { if (event.target === layer) close(); }, { once: true });
}

function markDirty() {
  dirty = true;
  const state = $("#draftState");
  state.className = "draft-state saving";
  state.innerHTML = "<i></i>正在暂存…";
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    state.className = "draft-state saved";
    state.innerHTML = "<i></i>草稿已保留";
  }, 700);
}

function addTopic(value) {
  const tags = $$(".topic-tag", $("#tagEditor"));
  if (!value) { $("#tagMessage").textContent = "知识点名称不能为空"; return false; }
  if (tags.some((tag) => tag.textContent.trim().startsWith(value))) { $("#tagMessage").textContent = "这个知识点已经添加"; return false; }
  if (tags.length >= 3) { $("#tagMessage").textContent = "最多添加 3 个主要知识点"; return false; }
  const tag = document.createElement("span");
  tag.className = "topic-tag";
  tag.innerHTML = `${value}<button type="button" aria-label="删除${value}">×</button>`;
  $("#tagEditor").insertBefore(tag, $("#tagInput"));
  tag.querySelector("button").addEventListener("click", () => { tag.remove(); markDirty(); addTagHint(); });
  markDirty();
  addTagHint();
  return true;
}

function addTag() {
  const input = $("#tagInput");
  if (addTopic(input.value.trim())) input.value = "";
}

function addTagHint() {
  $("#tagMessage").textContent = `还可添加 ${Math.max(0, 3 - $$(".topic-tag", $("#tagEditor")).length)} 个知识点`;
}

function pickerButton(level, value, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `knowledge-option${active ? " active" : ""}`;
  button.dataset.pickerLevel = level;
  button.dataset.pickerValue = value;
  button.textContent = value;
  return button;
}

function renderKnowledgePicker() {
  const subjects = Object.keys(knowledgeTree);
  const chapters = Object.keys(knowledgeTree[pickerState.subject]);
  const points = knowledgeTree[pickerState.subject][pickerState.chapter];
  const groups = [
    ["subject", subjects, pickerState.subject, "#subjectOptions"],
    ["chapter", chapters, pickerState.chapter, "#chapterOptions"],
    ["point", points, pickerState.point, "#pointOptions"]
  ];
  groups.forEach(([level, values, selected, selector]) => {
    const container = $(selector);
    container.replaceChildren(...values.map((value) => pickerButton(level, value, value === selected)));
  });
  $("#selectedKnowledgePath").textContent = `${pickerState.subject} / ${pickerState.chapter} / ${pickerState.point}`;
  $$(".knowledge-option").forEach((button) => button.addEventListener("click", () => {
    const { pickerLevel: level, pickerValue: value } = button.dataset;
    pickerState[level] = value;
    if (level === "subject") {
      pickerState.chapter = Object.keys(knowledgeTree[value])[0];
      pickerState.point = knowledgeTree[value][pickerState.chapter][0];
    } else if (level === "chapter") {
      pickerState.point = knowledgeTree[pickerState.subject][value][0];
    }
    renderKnowledgePicker();
  }));
}

export function setupEditor(navigate) {
  renderKnowledgePicker();
  $("#aiOrganizer").innerHTML = organizerIdle();
  bindOrganizer();
  $$("input, textarea", $("[data-page-view=\"editor\"]")).forEach((field) => field.addEventListener("input", markDirty));
  $$(".choice-pill").forEach((button) => button.addEventListener("click", () => { $$(".choice-pill").forEach((item) => item.classList.remove("active")); button.classList.add("active"); markDirty(); }));
  $("#imageDrop").addEventListener("click", openImageEditor);
  $("#imageDrop").addEventListener("dragover", (event) => { event.preventDefault(); event.currentTarget.classList.add("dragging"); });
  $("#imageDrop").addEventListener("dragleave", (event) => event.currentTarget.classList.remove("dragging"));
  $("#imageDrop").addEventListener("drop", (event) => { event.preventDefault(); event.currentTarget.classList.remove("dragging"); openImageEditor(); });
  $("#removeImage").addEventListener("click", () => { $("#imagePreview").hidden = true; $("#imageDrop").hidden = false; markDirty(); });
  $("#addTag").addEventListener("click", addTag);
  $("#addExistingKnowledge").addEventListener("click", () => addTopic(pickerState.point));
  $("#tagInput").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } });
  $("#editorBack").addEventListener("click", () => dirty ? confirmAction({ title: "离开编辑器？", description: "当前修改只保留为 Demo 草稿，不会写入真实卡片。", confirmText: "离开", onConfirm: () => navigate("library") }) : navigate("library"));
  $("#saveCard").addEventListener("click", async (event) => {
    if (!$("#questionInput").value.trim() && $("#imagePreview").hidden) { toast("题目文字和图片至少保留一项", "warning"); $("#questionInput").focus(); return; }
    event.currentTarget.disabled = true;
    event.currentTarget.querySelector("span").textContent = "保存中…";
    await delay(650);
    dirty = false;
    event.currentTarget.disabled = false;
    event.currentTarget.querySelector("span").textContent = "保存卡片";
    $("#draftState").className = "draft-state saved";
    $("#draftState").innerHTML = "<i></i>已保存 · revision 7";
    toast("卡片已保存（UI 模拟）");
  });
  $("#conflictButton").addEventListener("click", () => {
    $(".conflict-banner")?.remove();
    const banner = document.createElement("div");
    banner.className = "conflict-banner";
    banner.innerHTML = `${icon("warning")}<b>检测到更新版本。</b><span>当前草稿不会覆盖 revision 8；请重新载入后再比较。</span>`;
    $(".editor-layout").before(banner);
  });
}
