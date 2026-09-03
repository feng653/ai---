import { $, $$, icon, toast, delay } from "./ui.js";

const sourceBank = [
  { id: "d1", subject: "数学", point: "导数与单调性", type: "步骤遗漏", title: "函数单调区间与导数符号的完整对应", question: "已知函数在区间上严格递增，判断其导数在该区间的符号。", answer: "导数在区间内非负，但允许在个别点等于 0。" },
  { id: "d2", subject: "数学", point: "导数与单调性", type: "条件遗漏", title: "含参数函数的单调区间分类", question: "讨论参数 a 取不同值时，函数 f(x)=x³−3ax 的单调区间。", answer: "先由 f′(x)=3x²−3a 判断临界点是否存在，再按 a 的符号分类。" },
  { id: "d3", subject: "数学", point: "导数与单调性", type: "概念混淆", title: "由导函数图像判断原函数变化", question: "根据导函数图像跨越横轴的位置，写出原函数的增减区间。", answer: "导函数在横轴上方时原函数递增，下方时递减。" },
  { id: "e1", subject: "数学", point: "椭圆离心率", type: "概念混淆", title: "焦距与半焦距换算", question: "椭圆长轴长为 12、焦距为 6，求离心率。", answer: "a=6、c=3，所以 e=c/a=1/2。" },
  { id: "e2", subject: "数学", point: "椭圆离心率", type: "定义误用", title: "离心率范围判断", question: "若椭圆离心率为 3/5，且 a=10，求半焦距 c。", answer: "由 e=c/a 得 c=6。" },
  { id: "p1", subject: "数学", point: "条件概率", type: "定义误用", title: "条件变化后的样本空间", question: "已知事件 B 已发生，比较 P(A|B) 与 P(A)。", answer: "P(A|B)=P(A∩B)/P(B)，通常不等于 P(A)。" },
  { id: "f1", subject: "物理", point: "受力分析", type: "路径选择", title: "斜面模型中的受力分解", question: "物块静止在倾角 θ 的斜面上，求支持力。", answer: "垂直斜面方向平衡，N=mg cosθ。" },
  { id: "m1", subject: "物理", point: "碰撞模型", type: "条件遗漏", title: "动量守恒的系统边界", question: "两球在光滑水平面碰撞，写出碰撞前后的动量关系。", answer: "两球系统水平方向外力冲量为零，总动量守恒。" }
];

const pointGroups = [
  { subject: "数学", points: ["导数与单调性", "椭圆离心率", "条件概率"] },
  { subject: "物理", points: ["受力分析", "碰撞模型"] }
];

let selectedPoints = new Set(["导数与单调性"]);
let selectedSources = new Set(["d1", "d2", "d3"]);
let generationCount = 3;
let mode = "setup";
let savedCards = [];
let latestBatch = [];

const availableSources = () => sourceBank.filter((source) => selectedPoints.has(source.point));

function reconcileCount() {
  const minimum = selectedSources.size;
  generationCount = minimum ? Math.max(minimum, Math.min(generationCount, minimum + 4)) : 0;
}

function pointMarkup() {
  return pointGroups.map((group) => `<div class="practice-point-group"><strong>${group.subject}</strong><div>${group.points.map((point) => {
    const count = sourceBank.filter((source) => source.point === point).length;
    return `<button class="practice-point ${selectedPoints.has(point) ? "active" : ""}" type="button" data-review-point="${point}" aria-pressed="${selectedPoints.has(point)}"><span>${point}</span><b>${count}</b></button>`;
  }).join("")}</div></div>`).join("");
}

function sourceMarkup() {
  const sources = availableSources();
  if (!sources.length) return `<div class="practice-empty">先选择知识点，随后可精确选择其中的来源错题。</div>`;
  return `<div class="source-range-head"><span>范围内共 ${sources.length} 道错题</span><button id="toggleAllSources" type="button">${sources.every((source) => selectedSources.has(source.id)) ? "取消全选" : "全选范围"}</button></div><div class="practice-source-list">${sources.map((source) => `<button class="practice-source ${selectedSources.has(source.id) ? "selected" : ""}" type="button" role="checkbox" aria-checked="${selectedSources.has(source.id)}" data-review-source="${source.id}"><span class="check-box">${selectedSources.has(source.id) ? icon("check") : ""}</span><span><b>${source.title}</b><small>${source.point} · ${source.type}</small></span></button>`).join("")}</div>`;
}

function quantityMarkup() {
  const minimum = selectedSources.size;
  if (!minimum) return `<div class="practice-empty compact">至少选择一道来源错题后才能设置数量。</div>`;
  return `<div class="quantity-control"><label for="generationCountInput">生成卡片数</label><div class="quantity-input-group"><span class="quantity-input"><input id="generationCountInput" type="number" inputmode="numeric" min="${minimum}" max="50" step="1" value="${generationCount}" aria-describedby="quantityNote" /><span>张</span></span><span class="quantity-adjust"><button type="button" data-generation-adjust="-1" aria-label="减少生成数量" ${generationCount <= minimum ? "disabled" : ""}>${icon("subtract")}</button><button type="button" data-generation-adjust="1" aria-label="增加生成数量" ${generationCount >= 50 ? "disabled" : ""}>${icon("add")}</button></span></div></div><p class="quantity-note" id="quantityNote">最少 ${minimum} 张：每道来源错题至少生成 1 张，其余卡片优先覆盖重复薄弱点。</p>`;
}

function setupMarkup() {
  const sourceCount = selectedSources.size;
  return `<section class="practice-builder"><header class="practice-builder-head"><div><span class="section-kicker">PRACTICE CARD BUILDER</span><h2>从错题生成习题卡</h2><p>先限定知识点，再精确选择作为生成依据的错题。</p></div><span class="saved-total"><b>${savedCards.length}</b> 张已保存</span></header><div class="practice-builder-grid"><div class="practice-flow">
    <section class="practice-step"><header><span>01</span><div><h3>选择知识点范围</h3><p>支持跨知识点多选。</p></div></header><div class="practice-point-groups">${pointMarkup()}</div></section>
    <section class="practice-step"><header><span>02</span><div><h3>选择来源错题</h3><p>新题只基于勾选的错题生成。</p></div></header>${sourceMarkup()}</section>
    <section class="practice-step"><header><span>03</span><div><h3>设置生成数量</h3><p>下限随所选错题数自动变化。</p></div></header>${quantityMarkup()}</section>
  </div><aside class="practice-summary"><span class="section-kicker">本次生成</span><dl><div><dt>知识点</dt><dd>${selectedPoints.size} 个</dd></div><div><dt>来源错题</dt><dd>${sourceCount} 道</dd></div><div><dt>习题卡片</dt><dd>${generationCount} 张</dd></div></dl><div class="coverage-rule">${sourceCount ? `已保证 ${sourceCount} 道来源错题各生成至少 1 张。` : "请选择生成范围。"}</div><button class="button primary" id="generatePractice" type="button" ${sourceCount ? "" : "disabled"}>${icon("spark")}<span>生成并保存 ${generationCount} 张</span></button><small>Demo 仅演示生成与保存状态，不会调用真实 AI 或写入数据库。</small></aside></div></section>`;
}

function progressMarkup() {
  return `<section class="practice-generation"><span class="generation-mark">${icon("spark")}</span><span class="section-kicker">正在处理</span><h2>生成并保存 ${generationCount} 张习题卡</h2><p>当前窗口可继续停留，完成后将直接进入已保存卡片列表。</p><div class="generation-track"><i id="generationProgress"></i></div><div class="generation-steps"><span data-generation-step="1">核对 ${selectedSources.size} 道来源错题</span><span data-generation-step="2">生成覆盖不同薄弱点的变式</span><span data-generation-step="3">保存为独立习题卡片</span></div></section>`;
}

function cardMarkup(card, index) {
  return `<article class="practice-card" data-practice-card data-source-id="${card.source.id}" style="animation-delay:${index * 45}ms"><header><span class="status-chip">已保存</span><small>习题卡 ${String(index + 1).padStart(2, "0")}</small></header><div class="practice-card-body"><span>${card.source.point} · ${card.source.type}</span><h3>${card.question}</h3><p>依据：${card.source.title}</p></div><footer><button class="button quiet practice-answer-toggle" type="button" aria-expanded="false">查看答案</button><small>来源 1 道错题</small></footer><div class="practice-card-answer"><b>答案与思路</b><p>${card.source.answer}</p></div></article>`;
}

function savedMarkup() {
  return `<section class="practice-results"><header class="practice-results-head"><div><span class="section-kicker">SAVED PRACTICE CARDS</span><h2>本次 ${latestBatch.length} 张已全部保存</h2><p>每张练习题都是独立习题卡片，并保留生成来源。</p></div><button class="button quiet" id="continueGenerate" type="button">继续生成</button></header><div class="practice-card-grid">${latestBatch.map(cardMarkup).join("")}</div></section>`;
}

export function reviewMarkup() {
  if (mode === "generating") return progressMarkup();
  if (mode === "saved") return savedMarkup();
  return setupMarkup();
}

function buildBatch() {
  const chosen = sourceBank.filter((source) => selectedSources.has(source.id));
  return Array.from({ length: generationCount }, (_, index) => {
    const source = chosen[index % chosen.length];
    const cycle = Math.floor(index / chosen.length);
    return { id: `${source.id}-${Date.now()}-${index}`, source, question: cycle ? `${source.question}（进阶变式 ${cycle + 1}）` : source.question };
  });
}

async function generate(render) {
  mode = "generating";
  render();
  for (let step = 1; step <= 3; step += 1) {
    await delay(360);
    $(`[data-generation-step="${step}"]`)?.classList.add("done");
    if ($("#generationProgress")) $("#generationProgress").style.width = `${step / 3 * 100}%`;
  }
  await delay(180);
  latestBatch = buildBatch();
  savedCards = [...latestBatch, ...savedCards];
  mode = "saved";
  render();
  toast(`${latestBatch.length} 张习题卡已保存（UI 模拟）`);
}

export function bindReview(render) {
  const badge = $("#reviewTab b");
  if (badge) badge.textContent = String(savedCards.length);
  $$('[data-review-point]').forEach((button) => button.addEventListener("click", () => {
    const point = button.dataset.reviewPoint;
    const related = sourceBank.filter((source) => source.point === point);
    if (selectedPoints.has(point)) { selectedPoints.delete(point); related.forEach((source) => selectedSources.delete(source.id)); }
    else { selectedPoints.add(point); related.forEach((source) => selectedSources.add(source.id)); }
    reconcileCount();
    render();
  }));
  $$('[data-review-source]').forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.reviewSource;
    selectedSources.has(id) ? selectedSources.delete(id) : selectedSources.add(id);
    reconcileCount();
    render();
  }));
  $("#toggleAllSources")?.addEventListener("click", () => {
    const sources = availableSources();
    const allSelected = sources.every((source) => selectedSources.has(source.id));
    sources.forEach((source) => allSelected ? selectedSources.delete(source.id) : selectedSources.add(source.id));
    reconcileCount();
    render();
  });
  $("#generationCountInput")?.addEventListener("change", (event) => {
    const minimum = selectedSources.size;
    const requested = Number.parseInt(event.currentTarget.value, 10);
    generationCount = Number.isFinite(requested) ? Math.max(minimum, Math.min(50, requested)) : minimum;
    render();
  });
  $$('[data-generation-adjust]').forEach((button) => button.addEventListener("click", () => {
    generationCount = Math.max(selectedSources.size, Math.min(50, generationCount + Number(button.dataset.generationAdjust)));
    render();
  }));
  $("#generatePractice")?.addEventListener("click", () => generate(render));
  $("#continueGenerate")?.addEventListener("click", () => { mode = "setup"; render(); });
  $$(".practice-answer-toggle").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest(".practice-card");
    const open = card.classList.toggle("answer-open");
    button.textContent = open ? "收起答案" : "查看答案";
    button.setAttribute("aria-expanded", String(open));
  }));
}
