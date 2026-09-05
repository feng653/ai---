(() => {
  const D = window.FlowDemo, e = D.escape, flipped = new Set();
  let viewKey = '';
  function enter(key) { if (viewKey !== key) { flipped.clear(); viewKey = key; } }
  function render(item) {
    const back = flipped.has(item.id);
    const explanation = item.practiceKind === 'error-recall'
      ? (item.solution || '').replace(/^(依据：来源错题的「[^」]+」。)这是原型对已保存字段的提问，不代表 AI 已理解图片或验证概念。$/, '$1')
      : item.solution;
    return `<button type="button" class="flashcard ${back ? 'is-flipped' : ''}" data-action="flip-recall" data-value="${e(item.id)}" aria-label="${back ? '答案面，点击返回题目' : '题目面，点击查看答案'}" aria-describedby="flash-face-${e(item.id)}-${back ? 'back' : 'front'}">
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
    </button>`;
  }
  function toggle(node) {
    const back = !flipped.has(node.dataset.value);
    if (back) flipped.add(node.dataset.value); else flipped.delete(node.dataset.value);
    node.classList.toggle('is-flipped', back);
    node.setAttribute('aria-label', back ? '答案面，点击返回题目' : '题目面，点击查看答案');
    node.setAttribute('aria-describedby', `flash-face-${node.dataset.value}-${back ? 'back' : 'front'}`);
    node.querySelectorAll('.flashcard-face').forEach(face => {
      const hidden = face.classList.contains('flashcard-front') === back;
      face.setAttribute('aria-hidden', String(hidden)); face.toggleAttribute('inert', hidden);
    });
  }
  D.flashcards = { enter, render, toggle };
})();
