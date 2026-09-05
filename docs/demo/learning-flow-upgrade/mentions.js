(() => {
  const D = window.FlowDemo, input = document.getElementById('agent-message'), box = document.getElementById('mention-menu');
  let path = [], index = 0, options = [], anchor = -1, composing = false;
  const token = item => `@「${(item.question || '图片错题').slice(0, 26)} · ${item.id}」`;
  const refs = text => D.state.cards.filter(item => text.includes(token(item)));
  const instruction = text => D.state.cards.reduce((result, item) => result.split(token(item)).join(''), text).trim();
  function close() {
    box.hidden = true; anchor = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function show() {
    const query = input.value.slice(anchor + 1, input.selectionStart).toLocaleLowerCase();
    options = path.length < 3 ? D.taxonomy.children(path).map(label => ({ label })) : D.state.cards.filter(item => D.taxonomy.matches(item, path)).map(item => ({ label: `${D.names[item.type]} · ${item.question || '图片错题'}`, item }));
    options = options.filter(option => option.label.toLocaleLowerCase().includes(query));
    index = Math.max(0, Math.min(index, options.length - 1));
    box.hidden = false; input.setAttribute('aria-expanded', 'true');
    box.innerHTML = `<div class="mention-path">${D.escape(path.join(' / ') || '学科')}</div><div role="listbox" id="mention-options" aria-label="${['学科', '章节', '知识点', '卡片'][path.length]}">${options.map((option, i) => `<div role="option" id="mention-${i}" aria-selected="${i === index}" data-mention="${i}">${D.escape(option.label)}${option.item ? '' : ' ›'}</div>`).join('') || '<p class="muted">无匹配结果</p>'}</div>`;
    if (options.length) { input.setAttribute('aria-activedescendant', `mention-${index}`); document.getElementById(`mention-${index}`).scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }
  function choose() {
    const option = options[index]; if (!option) return;
    const end = input.selectionStart;
    if (option.item) {
      input.setRangeText(`${token(option.item)} `, anchor, end, 'end'); close();
    } else {
      path.push(option.label); input.setRangeText('@', anchor, end, 'end'); index = 0; show();
    }
    input.focus();
  }
  function sync() {
    if (composing) return;
    const before = input.value.slice(0, input.selectionStart), start = before.lastIndexOf('@');
    if (start < 0 || /[\n「」]/.test(before.slice(start + 1))) return close();
    if (anchor !== start) { path = []; index = 0; anchor = start; }
    show();
  }
  input.addEventListener('input', sync);
  input.addEventListener('click', sync);
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; sync(); });
  input.addEventListener('keydown', event => {
    if (box.hidden || event.isComposing || composing) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); index = options.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : 0; show();
    } else if (event.key === 'Tab' && event.shiftKey) {
      if (!path.length) return close();
      event.preventDefault(); path.pop(); input.setRangeText('@', anchor, input.selectionStart, 'end'); index = 0; show();
    } else if (event.key === 'Tab' || event.key === 'Enter') {
      if (!options.length && event.key === 'Tab') return close();
      event.preventDefault(); choose();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') close();
  });
  box.addEventListener('mousedown', event => { if (event.target.closest('[data-mention]')) event.preventDefault(); });
  box.addEventListener('click', event => { const node = event.target.closest('[data-mention]'); if (node) { index = Number(node.dataset.mention); choose(); } });
  input.addEventListener('blur', () => setTimeout(() => { if (!box.contains(document.activeElement)) close(); }, 100));
  D.mentions = { token, refs, instruction, close };
})();
