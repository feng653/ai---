(() => {
  const D = window.FlowDemo, s = D.state, V = D.views, $ = id => document.getElementById(id);
  let agentOpen = false, agentBusy = false, toastTimer, history = [];
  const main = $('main');
  function notify(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4500); }
  function persist() { const ok = D.persist(); if (!ok) notify('本地存储空间不足，当前内容仅保留在本次打开期间。请减少图片。'); return ok; }
  function focusMain() { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  function go(view, page = s.page, id = '') {
    history.push({ view: s.view, page: s.page, detailId: s.detailId, editorId: s.editorId, query: s.query, scroll: window.scrollY });
    if (page !== s.page) { s.queries ||= {}; s.queries[s.page] = s.query; s.query = s.queries[page] || ''; }
    s.view = view; s.page = page; if (view === 'detail') s.detailId = id; if (view === 'editor') s.editorId = id;
    render(); focusMain(); persist();
  }
  function render() {
    const activeId = document.activeElement?.id, start = document.activeElement?.selectionStart, end = document.activeElement?.selectionEnd;
    D.flashcards.enter(`${s.view}:${s.page}:${s.detailId}`);
    main.innerHTML = V.main(); D.taxonomy.render();
    document.querySelectorAll('[data-nav]').forEach(node => node.setAttribute('aria-current', node.dataset.nav === s.page ? 'page' : 'false'));
    Object.keys(D.names).forEach(type => $(`${type}-count`).textContent = s.cards.filter(item => item.type === type).length);
    $('activity-count').textContent = s.jobs.filter(job => !['completed', 'cancelled'].includes(job.status)).length;
    renderAgent();
    if (activeId && $(activeId)) { $(activeId).focus({ preventScroll: true }); if (typeof start === 'number') { try { $(activeId).setSelectionRange(start, end); } catch {} } }
    updateSaveButton();
  }
  function renderAgent() {
    $('agent-panel').hidden = !agentOpen; $('agent-launcher').hidden = agentOpen;
    $('agent-launcher').setAttribute('aria-expanded', String(agentOpen)); document.body.classList.toggle('agent-open', agentOpen);
    const oldScroll = $('agent-thread').scrollTop;
    $('agent-thread').innerHTML = V.agent() + (agentBusy ? '<p role="status" class="muted">正在处理（模拟）…</p>' : '');
    $('send-message').disabled = agentBusy;
    $('agent-thread').scrollTop = oldScroll;
  }
  function edit(id) {
    if (!s.drafts[id]) { const item = V.card(id); if (!item) return; s.drafts[id] = { ...D.copy(item), baseRev: item.rev, changed: false }; }
    go('editor', s.drafts[id].type, id);
  }
  function newCard() {
    const id = D.uid('m'); s.drafts[id] = { id, type: 'mistake', subject: s.treePath[0] || '数学', chapter: s.treePath[1] || '', points: s.treePath[2] || '', question: '', assets: [], baseRev: 0, changed: true };
    edit(id);
  }
  function valid(item) { return Boolean((item.question || '').trim() || item.assets?.length); }
  function fieldError(item) {
    if (!valid(item)) return '请填写题目或添加图片。';
    const points = (item.points || '').split(/[、,，\n]/).map(value => value.trim()).filter(Boolean);
    if (item.type === 'mistake' && points.length > 3) return '错题最多关联 3 个主要知识点，请用顿号分隔。';
    if (item.type === 'practice') {
      const existing = new Set(s.cards.filter(value => value.type !== 'practice').flatMap(value => (value.points || '').split(/[、,，\n]/).map(point => point.trim())));
      if (!points.length || points.some(point => !existing.has(point))) return '练习需关联已有知识点，请使用错题中已有的名称。';
    }
    return '';
  }
  function updateSaveButton() {
    const draft = V.pendingMistake(), capture = $('capture-button');
    capture.innerHTML = `<span class="nav-symbol" aria-hidden="true">${draft ? '续' : '＋'}</span><span class="nav-label">${draft ? '继续编辑' : '添加错题'}</span>`;
    capture.setAttribute('aria-label', draft ? '继续编辑' : '添加错题'); capture.title = draft ? '继续编辑' : '添加错题';
    capture.dataset.action = draft ? 'edit' : 'new'; capture.dataset.value = draft?.id || '';
    if ($('save-card')) $('save-card').disabled = !valid(s.drafts[s.editorId]);
    if ($('organize-button')) { const job = V.activeJob(s.editorId); $('organize-button').disabled = !valid(s.drafts[s.editorId]) || ['running', 'review'].includes(job?.status); }
  }
  function consumeOutcome() { const value = $('demo-outcome').value; $('demo-outcome').value = 'success'; return value; }
  function saveCard() {
    const draft = s.drafts[s.editorId], old = V.card(draft.id);
    if (fieldError(draft)) return notify(fieldError(draft));
    if (old && old.rev !== draft.baseRev) return notify('卡片已被其他操作更新。当前草稿保留，请回详情核对最新内容，勿直接覆盖。');
    if (consumeOutcome() === 'save-fail') return notify('模拟保存失败，草稿仍保留，可以再次保存。');
    const before = D.copy(s.cards), base = draft.baseRev;
    const stored = { ...D.copy(draft), rev: (old?.rev || 0) + 1, updated: '刚刚保存' };
    delete stored.baseRev; delete stored.changed;
    if (old) s.cards[s.cards.indexOf(old)] = stored; else s.cards.unshift(stored);
    draft.baseRev = stored.rev; draft.changed = false;
    if (!persist()) { s.cards = before; draft.baseRev = base; draft.changed = true; return; }
    render(); notify(`${D.names[draft.type]}已保存`);
  }
  function startJob(kind, target = '') {
    if (s.jobs.some(job => job.kind === kind && job.target === target && job.status === 'running')) return notify('这项操作正在进行，请勿重复提交。');
    if (kind === 'organize' && !valid(s.drafts[target])) return notify('先填写题目或添加图片。');
    const sources = s.selected.map(V.card).filter(item => item?.type === 'mistake');
    if (kind === 'practice' && (!sources.length || !Number.isInteger(s.count) || s.count < sources.length || s.count > 50)) return notify('请选择来源，数量须为来源数到 50 之间的整数。');
    if (kind === 'practice' && (sources.some(item => !D.recall.available(item).length) || s.count > sources.reduce((sum, item) => sum + D.recall.available(item).length, 0))) return notify('请先整理每道来源错题的错因，并将数量设为可用问答数以内。');
    const job = { id: D.uid('job'), kind, target, title: kind === 'organize' ? '整理错题' : `生成 ${s.count} 条错因问答`, status: 'running', outcome: consumeOutcome(), snapshot: kind === 'organize' ? D.copy(s.drafts[target]) : { sources: D.copy(sources), count: s.count, difficulty: s.difficulty, requirement: s.requirement } };
    s.jobs.push(job); persist(); render(); notify('处理中'); runJob(job);
  }
  function runJob(job) {
    setTimeout(() => {
      if (job.status !== 'running') return;
      if (job.outcome !== 'success') { job.status = 'failed'; job.error = job.outcome === 'ai-fail' ? '模拟 AI 失败，输入仍保留；未保存新结果。' : '模拟保存失败，输入仍保留；没有写入新卡片。'; }
      else if (job.kind === 'organize') {
        job.status = 'review'; job.suggestions = { solution: '示例建议：先确定定义域，再求导并按临界点分段，完整检查每个区间的符号。', errorReason: '示例诊断：需要检查是否遗漏边界或部分区间。请结合原题判断。', note: '逐段列出结论，再回到原题检查条件。' }; job.choices = { solution: true, errorReason: false, note: true };
      } else if (job.snapshot.sources.some(source => V.card(source.id)?.rev !== source.rev)) {
        job.status = 'failed'; job.error = '来源卡片已变化，本轮未保存。请核对当前来源后重新点击“生成并保存”。';
      } else {
        const oldCards = D.copy(s.cards);
        const created = D.recall.create(job.snapshot);
        s.cards.unshift(...created); job.resultIds = created.map(item => item.id); job.status = 'completed';
        if (!persist()) { s.cards = oldCards; job.status = 'failed'; job.error = '本地保存失败，没有新增练习；请减少图片后重试。'; }
      }
      persist(); render(); notify(job.status === 'failed' ? job.error : job.status === 'review' ? '整理完成 · 待应用' : '问答已保存');
    }, 1600);
  }
  function applySuggestions(job) {
    const draft = s.drafts[job.target]; let applied = 0;
    for (const [key, value] of Object.entries(job.suggestions)) if (job.choices[key] && (draft[key] || '') === (job.snapshot[key] || '')) { draft[key] = value; applied++; }
    if (!applied) return notify('没有可应用的建议；运行期间修改的字段会保留。');
    draft.changed = true; job.status = 'completed'; persist(); render(); notify('已应用 · 未保存');
  }
  function toggleAgent() {
    agentOpen = !agentOpen; renderAgent(); if (agentOpen) $('agent-message').focus(); else $('agent-launcher').focus();
  }
  function createProposal(item, text) {
    const after = D.copy(item), key = 'solution';
    const explicit = text.match(/(?:改成|改为)[：:\s]*([\s\S]+)/);
    after[explicit ? (text.includes('补充') ? 'note' : key) : 'note'] = explicit ? explicit[1] : `${item.note || ''}${item.note ? '\n' : ''}示例建议：逐项检查条件，保留完整推导。`;
    s.proposal = { before: D.copy(item), after, error: '' };
  }
  function sendAgent(text) {
    if (agentBusy) return;
    if (s.proposal) return notify('请先批准或拒绝当前修改建议，避免丢失未处理内容。');
    const references = D.mentions.refs(text), request = D.mentions.instruction(text), outcome = consumeOutcome(); D.mentions.close();
    s.chat.push({ role: 'user', text }); agentBusy = true; $('agent-message').value = ''; renderAgent();
    setTimeout(() => {
      agentBusy = false;
      if (outcome === 'ai-fail') s.chat.push({ role: 'assistant', text: '模拟请求失败，卡片没有改变。可重新发送刚才的要求。' });
      else if (/联网|搜索|资料/.test(request)) s.chat.push({ role: 'assistant', text: '未联网 · 模拟结果', search: true });
      else if (/修改|编辑|完善|改成|改为/.test(request)) {
        const item = references[0];
        if (!item) s.chat.push({ role: 'assistant', text: '未引用卡片' });
        else { s.pendingEdits = references.slice(1).map(item => ({ item: D.copy(item), request })); createProposal(item, request); s.proposal.forceFail = outcome === 'save-fail'; s.chat.push({ role: 'assistant', text: '修改待批准' }); }
      } else s.chat.push({ role: 'assistant', text: '模拟对话' });
      persist(); renderAgent(); $('agent-thread').scrollTop = $('agent-thread').scrollHeight;
    }, 1000);
  }
  function approve() {
    const p = s.proposal; if (!p) return;
    const current = V.card(p.before.id);
    if (!current || current.rev !== p.before.rev) { p.error = '卡片已变化，修改尚未保存。请重新读取并核对后再提交。'; renderAgent(); return; }
    if (fieldError(p.after)) { p.error = fieldError(p.after); renderAgent(); return; }
    if (p.forceFail || consumeOutcome() === 'save-fail') { p.forceFail = false; p.error = '模拟保存失败。建议仍保留，可以重试。'; renderAgent(); return; }
    const beforeCards = D.copy(s.cards);
    s.cards[s.cards.indexOf(current)] = { ...D.copy(p.after), rev: current.rev + 1, updated: 'Agent 刚刚保存' };
    if (!persist()) { s.cards = beforeCards; p.error = '保存失败，卡片未更新。'; renderAgent(); return; }
    s.chat.push({ role: 'assistant', text: `已保存${D.names[current.type]}的修改`, cardId: current.id });
    nextProposal(); persist(); render(); notify('Agent 修改已保存。');
  }
  function nextProposal() {
    s.proposal = null; const next = s.pendingEdits?.shift(); if (next) createProposal(next.item, next.request);
  }
  async function upload(input) {
    const context = input.dataset.upload, item = context === 'editor' ? s.drafts[s.editorId] : s.proposal?.after;
    if (!item) return;
    for (const file of input.files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) { notify('支持 PNG、JPEG、WebP，单张不超过 15MB。'); continue; }
      if (item.assets.length >= 3) { notify('最多 3 张图片'); break; }
      try {
        const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        item.assets.push({ name: file.name, data }); if (context === 'editor') item.changed = true;
      } catch { notify('图片读取失败，原有内容已保留。'); }
    }
    persist(); render();
  }
  document.addEventListener('click', event => {
    const tree = event.target.closest('[data-path]');
    if (tree) { s.treePath = JSON.parse(tree.dataset.path); if (s.view !== 'builder') s.view = 'list'; render(); persist(); return; }
    const nav = event.target.closest('[data-nav]');
    if (nav) { s.query = ''; history = []; s.page = nav.dataset.nav; s.view = 'list'; render(); focusMain(); persist(); return; }
    const node = event.target.closest('[data-action]'); if (!node) return;
    const { action, value } = node.dataset, job = s.jobs.find(item => item.id === value);
    if (action === 'flip-recall') return D.flashcards.toggle(node);
    if (action === 'new') return newCard();
    if (action === 'edit') return edit(value);
    if (action === 'detail') { const item = V.card(value); if (item) go('detail', item.type, value); return; }
    if (action === 'back') { const previous = history.pop(); if (previous) Object.assign(s, previous); else s.view = 'list'; render(); main.focus({ preventScroll: true }); window.scrollTo(0, previous?.scroll || 0); return; }
    if (action === 'clear-tree') { s.treePath = []; render(); persist(); return; }
    if (action === 'clear-query') { s.query = ''; render(); return; }
    if (action === 'select') { s.selected = s.selected.includes(value) ? s.selected.filter(id => id !== value) : [...s.selected, value]; s.count = Math.max(s.count, s.selected.length); persist(); render(); return; }
    if (action === 'clear-selection') { s.selected = []; persist(); render(); return; }
    if (action === 'build' || action === 'build-one') { if (action === 'build-one') s.selected = [value]; s.selected = s.selected.filter(id => V.card(id)?.type === 'mistake'); const max = s.selected.map(V.card).reduce((sum, item) => sum + D.recall.available(item).length, 0); s.count = Math.max(s.selected.length || 1, Math.min(s.count, max || 1)); go('builder', 'practice'); return; }
    if (action === 'practice-list') { s.queries ||= {}; s.queries.practice = ''; s.query = ''; go('list', 'practice'); return; }
    if (action === 'settings') return go('settings');
    if (action === 'activity') return go('activity');
    if (action === 'save') return saveCard();
    if (action === 'organize') return startJob('organize', s.editorId);
    if (action === 'generate') return startJob('practice');
    if (action === 'stop' && job) { job.status = 'cancelled'; persist(); render(); notify('已停止；原始输入和已保存卡片保留。'); return; }
    if (action === 'retry' && job) { job.status = 'running'; job.error = ''; job.outcome = consumeOutcome(); persist(); render(); runJob(job); return; }
    if (action === 'apply' && job) return applySuggestions(job);
    if (action === 'discard' && job) { job.status = 'cancelled'; persist(); render(); return; }
    if (action === 'job-open' && job) return job.kind === 'organize' ? edit(job.target) : go('builder', 'practice');
    if (action === 'agent-toggle') return toggleAgent();
    if (action === 'agent-edit') { agentOpen = true; renderAgent(); $('agent-message').value = `${D.mentions.token(V.card(value))} 请帮我完善这张卡片`; $('agent-message').focus(); return; }
    if (action === 'agent-result') { const item = V.card(value); if (item) { agentOpen = false; go('detail', item.type, value); } return; }
    if (action === 'suggest') { $('agent-message').value = value === 'search' ? '联网查找导数与单调性的资料' : '帮我完善引用卡片的解法'; $('agent-message').focus(); return; }
    if (action === 'approve') return approve();
    if (action === 'reject') { nextProposal(); s.chat.push({ role: 'assistant', text: '已拒绝，卡片没有改变。' }); persist(); renderAgent(); return; }
    if (action === 'refresh-proposal') {
      const p = s.proposal, item = V.card(p?.before.id);
      if (item) {
        const after = D.copy(item);
        D.fields[item.type].forEach(([key]) => { if ((p.after[key] || '') !== (p.before[key] || '')) after[key] = p.after[key]; });
        if (JSON.stringify(p.after.assets) !== JSON.stringify(p.before.assets)) after.assets = D.copy(p.after.assets);
        s.proposal = { before: D.copy(item), after, error: '已读取最新版本并保留你的修改意图。请重新核对差异后批准。' };
      }
      persist(); renderAgent(); return;
    }
    if (action === 'asset-remove' || action === 'asset-up') {
      const [context, indexText] = value.split(':'), index = Number(indexText), item = context === 'editor' ? s.drafts[s.editorId] : s.proposal?.after;
      if (!item) return; if (action === 'asset-remove') item.assets.splice(index, 1); else if (index > 0) [item.assets[index - 1], item.assets[index]] = [item.assets[index], item.assets[index - 1]];
      if (context === 'editor') item.changed = true; persist(); render();
    }
  });
  document.addEventListener('input', event => {
    const node = event.target;
    if (node.id === 'library-query') { s.query = node.value; render(); persist(); return; }
    if (node.dataset.field) {
      const item = node.dataset.context === 'editor' ? s.drafts[s.editorId] : s.proposal?.after; if (!item) return;
      item[node.dataset.field] = node.value;
      if (node.dataset.context === 'editor') { item.changed = true; $('editor-save-status').textContent = persist() ? '未保存' : '暂存失败'; updateSaveButton(); }
      else { const temp = document.createElement('div'); temp.innerHTML = V.proposal(); $('change-summary').innerHTML = temp.querySelector('#change-summary').innerHTML; persist(); }
    }
    if (node.id === 'practice-count-input') { s.count = Number(node.value); persist(); }
    if (node.id === 'practice-difficulty') { s.difficulty = node.value; persist(); }
    if (node.id === 'practice-requirement') { s.requirement = node.value; persist(); }
    if (node.id === 'practice-attempt') { s.attempts ||= {}; s.attempts[s.detailId] = node.value; persist(); }
    if (node.dataset.review) { const job = V.activeJob(s.editorId); if (job) { job.choices[node.dataset.review] = node.checked; persist(); } }
  });
  document.addEventListener('change', event => { if (event.target.dataset.upload) upload(event.target); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && agentOpen) toggleAgent(); });
  $('agent-form').addEventListener('submit', event => { event.preventDefault(); const text = $('agent-message').value.trim(); if (text) sendAgent(text); });
  if (s.view === 'editor' && !s.drafts[s.editorId]) s.view = 'list';
  render(); persist();
})();
