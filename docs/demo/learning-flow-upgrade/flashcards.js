(() => {
  const D = window.FlowDemo, e = D.escape, flipped = new Set();
  let viewKey = '';
  function enter(key) { if (viewKey !== key) { flipped.clear(); viewKey = key; } }
  function render(item) {
    const back = flipped.has(item.id);
    const explanation = item.practiceKind === 'error-recall'
      ? (item.solution || '').replace(/^(依据：来源错题的「[^」]+」。)这是原型对已保存字段的提问，不代表 AI 已理解图片或验证概念。$/, '$1')
      : item.solution;
    return `<div class="flashcard-wrap"><button type="button" class="flashcard ${back ? 'is-flipped' : ''}" data-action="flip-recall" data-value="${e(item.id)}" aria-label="${back ? '答案面，点击返回题目' : '题目面，点击查看答案'}" aria-describedby="flash-face-${e(item.id)}-${back ? 'back' : 'front'}">
      <span class="flashcard-inner">
        <span class="flashcard-face flashcard-front" id="flash-face-${e(item.id)}-front" aria-hidden="${back}" ${back ? 'inert' : ''}>
          <span class="flashcard-label">题目</span><span class="flashcard-question">${e(item.question || '图片题目')}</span>
          ${(item.assets || []).map(asset => `<img class="flashcard-image" src="${e(asset.data)}" alt="${e(asset.name)}">`).join('')}
          ${item.promptContext ? `<span class="flashcard-context">来源题目：${e(item.promptContext)}</span>` : ''}
        </span>
        <span class="flashcard-face flashcard-back" id="flash-face-${e(item.id)}-back" aria-hidden="${!back}" ${!back ? 'inert' : ''}>
          <span class="flashcard-label">答案</span><span class="flashcard-answer">${e(item.answer || '暂无答案')}</span>
          ${explanation ? `<span class="flashcard-explanation">${e(explanation)}</span>` : ''}
        </span>
      </span>
    </button><button type="button" class="flashcard-expand" data-expand-recall="${e(item.id)}" ${back ? "" : "hidden"}>查看详情</button></div>`;
  }
  function toggle(node) {
    const back = !flipped.has(node.dataset.value);
    if (back) flipped.add(node.dataset.value); else flipped.delete(node.dataset.value);
    node.classList.toggle('is-flipped', back);
    node.parentElement.querySelector('[data-expand-recall]').hidden = !back;
    node.setAttribute('aria-label', back ? '答案面，点击返回题目' : '题目面，点击查看答案');
    node.setAttribute('aria-describedby', `flash-face-${node.dataset.value}-${back ? 'back' : 'front'}`);
    node.querySelectorAll('.flashcard-face').forEach(face => {
      const hidden = face.classList.contains('flashcard-front') === back;
      face.setAttribute('aria-hidden', String(hidden)); face.toggleAttribute('inert', hidden);
    });
  }
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-expand-recall]');
    if (!opener) return;
    const item = D.state.cards.find(card => card.id === opener.dataset.expandRecall);
    if (!item) return;
    const rect = opener.parentElement.getBoundingClientRect(), dialog = document.createElement('dialog');
    dialog.className = 'recall-dialog'; dialog.setAttribute('aria-label', '复习卡详情');
    dialog.innerHTML = `<header><strong>复习卡</strong><button type="button">关闭</button></header><div><h2>题目</h2><p>${e(item.question)}</p><h2>答案</h2><p>${e(item.answer)}</p><h2>解法</h2><p>${e(item.solution)}</p></div>`;
    const overflow = document.body.style.overflow;
    const close = () => { dialog.close(); dialog.remove(); document.body.style.overflow = overflow; opener.focus(); };
    dialog.querySelector('button').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.append(dialog); dialog.showModal(); document.body.style.overflow = 'hidden';
    const end = dialog.getBoundingClientRect();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) dialog.animate([
      { transform: `translate(${rect.x-end.x}px,${rect.y-end.y}px) scale(${rect.width/end.width},${rect.height/end.height})`, opacity: .5 },
      { transform: 'none', opacity: 1 }
    ], { duration: 260, easing: 'ease-out' });
  });
  D.flashcards = { enter, render, toggle };
})();
