import { cards } from "./data.js";
import { $, icon, confirmAction, toast } from "./ui.js";

let activeSource = null;
let activeCard = null;

function detailMarkup(card) {
  return `<article class="card-detail" role="dialog" aria-modal="true" aria-labelledby="detailHeading">
    <header><button class="icon-button" data-detail-close type="button" aria-label="返回卡片列表">${icon("back")}</button><div class="detail-title"><small>${card.subject} · ${card.updated}</small><strong id="detailHeading">${card.title}</strong></div><span class="status-chip ${card.status === "待完善" ? "warn" : ""}">${card.status}</span><button class="icon-button" data-detail-edit type="button" aria-label="编辑卡片">${icon("edit")}</button><button class="icon-button" data-detail-delete type="button" aria-label="删除卡片">${icon("trash")}</button></header>
    <div class="detail-body"><main class="detail-main"><span class="section-kicker">QUESTION</span><h1>${card.question}</h1><div class="detail-image"><div class="mock-problem-image">f(x) = x³ − 3x</div></div><div class="answer-compare"><section class="answer-block mine"><small>我的答案</small><p>${card.mine}</p></section><section class="answer-block correct"><small>正确答案</small><p>${card.correct}</p></section></div><section class="solution-block"><h3>正确解法</h3><p>${card.solution}</p></section><section class="solution-block"><h3>补充说明</h3><p>结论按定义域顺序书写，可以直接避免区间遗漏。长公式区域允许横向安全滚动，不压缩正文。</p></section></main>
    <aside class="detail-aside"><span class="section-kicker">DIAGNOSIS</span><section class="diagnosis-card"><small>第一处错误</small><strong>${card.summary}</strong></section><section class="diagnosis-card"><small>错误原因</small><strong>${card.diagnosis}</strong></section><section class="diagnosis-card"><small>错误类型</small><strong>${card.type}</strong></section><section class="diagnosis-card"><small>知识路径</small><div class="knowledge-path"><span>${card.subject}</span>${card.tags.map((tag) => `<span>${tag}</span>`).join("")}</div></section></aside></div>
  </article>`;
}

function makeClone(source, rect) {
  const clone = source.cloneNode(true);
  clone.classList.add("morph-clone");
  Object.assign(clone.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    animation: "none", transform: "none"
  });
  document.body.append(clone);
  return clone;
}

async function morphOpen(source, detail, layer) {
  if (!source || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    detail.style.visibility = "";
    layer.classList.add("open");
    return;
  }
  const start = source.getBoundingClientRect();
  const end = detail.getBoundingClientRect();
  const clone = makeClone(source, start);
  layer.style.background = "transparent";
  detail.style.visibility = "hidden";
  await clone.animate([
    { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, borderRadius: "17px" },
    { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`, borderRadius: "24px" }
  ], { duration: 420, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" }).finished;
  clone.remove();
  detail.style.visibility = "";
  detail.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 160 });
  layer.style.background = "";
  layer.classList.add("open");
}

async function morphClose() {
  const layer = $("#cardDetailLayer");
  const detail = $(".card-detail", layer);
  const endSource = activeSource?.isConnected ? activeSource : $(`[data-card-id="${activeCard?.id}"]`);
  if (!detail || !endSource || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    layer.hidden = true;
    layer.innerHTML = "";
    return;
  }
  const start = detail.getBoundingClientRect();
  const end = endSource.getBoundingClientRect();
  const clone = makeClone(endSource, start);
  detail.style.visibility = "hidden";
  layer.style.background = "transparent";
  await clone.animate([
    { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, opacity: 1, borderRadius: "24px" },
    { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`, opacity: .88, borderRadius: "17px" }
  ], { duration: 330, easing: "cubic-bezier(.4,0,.3,1)", fill: "forwards" }).finished;
  clone.remove();
  layer.hidden = true;
  layer.innerHTML = "";
  endSource.focus?.();
}

export async function openCardDetail(id, source, navigate) {
  const card = cards.find((item) => item.id === id) ?? cards[0];
  const layer = $("#cardDetailLayer");
  activeSource = source;
  activeCard = card;
  layer.innerHTML = detailMarkup(card);
  layer.hidden = false;
  const detail = $(".card-detail", layer);
  await morphOpen(source, detail, layer);
  $("[data-detail-close]", layer).addEventListener("click", morphClose);
  $("[data-detail-edit]", layer).addEventListener("click", async () => { await morphClose(); navigate("editor"); });
  $("[data-detail-delete]", layer).addEventListener("click", () => confirmAction({
    title: "删除这张错题卡？",
    description: "Demo 只演示删除确认，不会修改真实数据。",
    confirmText: "删除卡片",
    danger: true,
    onConfirm: async () => { await morphClose(); toast("卡片已移除（UI 模拟）"); }
  }));
  layer.addEventListener("click", (event) => { if (event.target === layer) morphClose(); });
  $("[data-detail-close]", layer).focus();
}

export function closeCardDetail() {
  if (!$("#cardDetailLayer").hidden) morphClose();
}
