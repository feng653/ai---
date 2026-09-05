(() => {
  const D = window.FlowDemo, s = D.state, e = D.escape;
  const button = (text, action, value = '', cls = '') => `<button class="${cls}" data-action="${action}" data-value="${e(value)}" type="button">${e(text)}</button>`;
  const card = id => s.cards.find(item => item.id === id);
  const pendingMistake = () => Object.values(s.drafts).find(item => item.type === 'mistake' && item.changed);
  const activeJob = id => [...s.jobs].reverse().find(job => job.target === id && job.kind === 'organize');
  const statusNames = { running: '进行中', review: '待应用建议', completed: '已完成', failed: '失败，可重试', cancelled: '已停止', interrupted: '已中断，可重试' };
  function images(item, context) {
    return `<div class="assets">${(item.assets || []).map((asset, index) => `<div class="asset"><img src="${e(asset.data)}" alt="${e(asset.name)}"><small>${e(asset.name)}</small>${context ? `${button('移除图片', 'asset-remove', `${context}:${index}`)}${index ? button('前移', 'asset-up', `${context}:${index}`) : ''}` : ''}</div>`).join('')}</div>${context ? `<label>添加图片<input type="file" data-upload="${context}" accept="image/png,image/jpeg,image/webp" multiple></label>` : ''}`;
  }
  function fields(item, prefix) {
    const extra = ['userAnswer', 'answer', 'solution', 'errorType', 'note'];
    const field = ([key, label]) => {
      const long = !['subject', 'chapter', 'points', 'errorType'].includes(key);
      return `<label class="${long ? 'wide' : ''}" for="${prefix}-${key}">${label}${long ? `<textarea id="${prefix}-${key}" data-field="${key}" data-context="${prefix}" rows="${key === 'question' ? 3 : 2}">${e(item[key] || '')}</textarea>` : `<input id="${prefix}-${key}" data-field="${key}" data-context="${prefix}" value="${e(item[key] || '')}">`}</label>`;
    };
    const all = D.fields[item.type];
    if (item.type !== 'mistake' || prefix !== 'editor') return `<div class="field-grid">${all.map(field).join('')}</div>`;
    return `<div class="field-grid">${all.filter(([key]) => !extra.includes(key)).map(field).join('')}</div><details class="extra-fields"><summary>答案、解法与补充记录</summary><div class="field-grid">${all.filter(([key]) => extra.includes(key)).map(field).join('')}</div></details>`;
  }
  function list() {
    const type = s.page, list = s.cards.filter(item => item.type === type && D.taxonomy.matches(item) && [item.question, item.subject, item.chapter, item.points, item.errorReason, item.note].join(' ').toLowerCase().includes(s.query.toLowerCase()));
    const draft = pendingMistake();
    return `<div class="page-head"><div><h1>${type === 'mistake' ? '我的错题' : type === 'practice' ? '错因复习' : '知识卡'}</h1></div>${type === 'mistake' ? button(draft ? '继续编辑' : '添加错题', draft ? 'edit' : 'new', draft?.id || '', 'primary') : type === 'practice' ? button('生成复习问答', 'build', '', 'primary') : ''}</div>
      <div class="toolbar"><label for="library-query">搜索${D.names[type]}<input id="library-query" type="search" value="${e(s.query)}"></label>${s.query ? button('清除', 'clear-query') : ''}</div>
      ${s.treePath?.length ? `<p class="filter-path">${e(s.treePath.join(" / "))} ${button("全部分类", "clear-tree")}</p>` : ""}
      <div class="cards">${list.map(item => type === 'practice' ? `<article class="recall-tile"><div class="meta"><span class="tag">${e(item.points || '待归档')}</span><span>${e(item.updated)}</span></div>${D.flashcards.render(item)}<div class="actions">${button('查看来源与编辑', 'detail', item.id, 'text-button')}</div></article>` : `<article class="card"><div class="meta"><span class="tag">${e(item.points || '待归档')}</span><span>${e(item.updated)}</span></div><h2>${e(item.question || '图片错题')}</h2><p>${e((item.errorReason || item.body || item.note || '').slice(0, 85))}</p><div class="actions">${button('打开', 'detail', item.id, 'text-button')}${type === 'mistake' ? `<button data-action="select" data-value="${e(item.id)}" aria-pressed="${s.selected.includes(item.id)}">${s.selected.includes(item.id) ? '已选为复习来源 · 移出' : '选为复习来源'}</button>` : button(type === 'practice' ? '开始复习' : '查看内容', 'detail', item.id)}</div></article>`).join('') || `<div class="empty"><h2>${s.query || s.treePath?.length ? '无匹配结果' : `暂无${D.names[type]}`}</h2></div>`}</div>
      ${s.selected.length ? `<div class="selection-bar"><span>已选 ${s.selected.length} 张复习来源</span><div class="actions">${button('清空', 'clear-selection')}${button('生成复习问答', 'build')}</div></div>` : ''}`;
  }
  function jobBox(job) {
    if (!job) return '';
    return `<section class="status-box ${['failed', 'interrupted'].includes(job.status) ? 'error' : ''}" aria-label="任务进度"><div><strong>${e(job.title)} · ${statusNames[job.status]}</strong>${job.error ? `<p>${e(job.error)}</p>` : ''}</div><div class="actions">${job.status === 'running' ? button('停止', 'stop', job.id) : ['failed', 'interrupted'].includes(job.status) ? button('重试', 'retry', job.id) : ''}</div></section>`;
  }
  function review(job, draft) {
    if (!job || job.status !== 'review') return '';
    return `<section class="panel"><h2>整理建议</h2>${Object.entries(job.suggestions).map(([key, value]) => {
      const conflict = (draft[key] || '') !== (job.snapshot[key] || '');
      const name = D.fields.mistake.find(([field]) => field === key)?.[1] || key;
      return `<div class="review-row"><label><input type="checkbox" data-review="${key}" ${job.choices[key] && !conflict ? 'checked' : ''} ${conflict ? 'disabled' : ''}>${name}${conflict ? ' · 字段已修改' : ''}</label><small>当前：${e(draft[key] || '尚未填写')}</small><p>${e(value)}</p></div>`;
    }).join('')}<div class="actions" style="margin-top:20px">${button('应用所选建议', 'apply', job.id, 'primary')}${button('放弃建议', 'discard', job.id)}</div></section>`;
  }
  function editor() {
    const draft = s.drafts[s.editorId], job = activeJob(s.editorId);
    return `<div class="page-head"><div><h1>${card(draft.id) ? '编辑' : '添加'}${D.names[draft.type]}</h1></div>${button('返回', 'back')}</div>
      ${jobBox(job)}${review(job, draft)}<section class="panel"><div class="editor-top"><div><h2>${draft.type === 'knowledge' ? '知识内容' : '题目与整理'}</h2></div>${draft.type === 'mistake' ? `<div class="editor-actions"><button id="organize-button" data-action="organize" ${job?.status === 'running' || job?.status === 'review' ? 'disabled' : ''}>AI 整理</button></div>` : ''}</div><div style="margin-top:24px"><section class="capture-images">${images(draft, 'editor')}</section>${fields(draft, 'editor')}</div>
      <div class="save-bar"><span class="save-status" id="editor-save-status">${draft.changed ? '未保存' : '已保存'}</span><button class="primary" id="save-card" data-action="save">保存${D.names[draft.type]}</button></div></section>`;
  }
  function detail() {
    const item = card(s.detailId);
    if (!item) return `<div class="empty"><h1>找不到这张卡片</h1>${button('返回', 'back')}</div>`;
    const isPractice = item.type === 'practice';
    return `<div class="page-head"><div><h1>${D.names[item.type]}</h1><p>${e(item.points || '待归档')} · ${e(item.updated)}</p></div>${button('返回原位置', 'back')}</div><article class="panel">${isPractice ? '' : `<h2>${e(item.question || '图片错题')}</h2>${images(item)}`}
      ${isPractice ? `${D.flashcards.render(item)}<details class="answer-block"><summary>我的回答</summary><label for="practice-attempt">回答<textarea id="practice-attempt" rows="3">${e(s.attempts?.[item.id] || '')}</textarea></label></details>` : D.fields[item.type].filter(([key]) => !['question', 'subject', 'points'].includes(key) && item[key]).map(([key, label]) => `<section class="answer-block"><h2>${label}</h2><div class="answer">${e(item[key])}</div></section>`).join('')}
      ${item.sources?.length ? `<section class="answer-block"><h2>来源错题</h2><div class="actions">${item.sources.map(id => card(id) ? button(card(id).question || '打开来源图片错题', 'detail', id, 'text-button') : '<span class="muted">来源已删除</span>').join('')}</div></section>` : ''}
      <div class="save-bar"><div class="actions">${button('手工编辑', 'edit', item.id)}${button('让 Agent 编辑', 'agent-edit', item.id)}</div>${item.type === 'mistake' ? button('围绕错误生成问答', 'build-one', item.id, 'primary') : ''}</div></article>`;
  }
  function builder() {
    const job = [...s.jobs].reverse().find(item => item.kind === 'practice'), selected = s.selected.map(card).filter(item => item?.type === 'mistake');
    const total = selected.reduce((sum, item) => sum + D.recall.available(item).length, 0);
    return `<div class="page-head"><div><h1>围绕错误生成问答</h1></div>${button('返回', 'back')}</div>${jobBox(job)}${job?.status === 'completed' ? button('打开复习问答', 'practice-list', '', 'primary') : ''}
      <section class="panel"><h2>本次来源</h2><div class="source-list">${selected.map(item => `<span class="source-chip">${e(item.question || '图片错题')}${button('移出', 'select', item.id)}</span>`).join('') || '<p>未选择</p>'}</div><details ${!selected.length ? 'open' : ''}><summary>选择错题</summary>${s.cards.filter(item => item.type === 'mistake' && D.taxonomy.matches(item)).map(item => `<div class="job-row"><div>${e(item.question || '图片错题')}<p>${e(item.errorReason || '尚未整理错因')}</p></div>${button(s.selected.includes(item.id) ? '移出来源' : '加入来源', 'select', item.id)}</div>`).join('') || '<p>暂无错题</p>'}</details></section>
      <section class="panel"><h2>问答内容</h2><label for="practice-count-input">生成数量<input id="practice-count-input" type="number" min="${Math.max(1, selected.length)}" max="${Math.min(50, total)}" value="${s.count}"><small>可生成 ${Math.min(50, total)} 条</small></label><label for="practice-requirement">复习重点<textarea id="practice-requirement" maxlength="500">${e(s.requirement)}</textarea></label><div class="save-bar"><button id="generate-practice" data-action="generate" class="primary" ${!selected.length || !total || job?.status === 'running' ? 'disabled' : ''}>生成并保存</button></div></section>`;
  }
  function activity() {
    return `<div class="page-head"><div><h1>最近进度</h1></div>${button('返回', 'back')}</div><section class="panel">${[...s.jobs].reverse().map(job => `<div class="job-row"><div><strong>${e(job.title)}</strong><p>${statusNames[job.status]}${job.error ? ` · ${e(job.error)}` : ''}</p></div>${button(job.kind === 'organize' ? '回到错题' : '查看练习', 'job-open', job.id)}</div>`).join('') || '<p>暂无记录</p>'}</section>`;
  }
  function proposal() {
    const p = s.proposal;
    if (!p) return '';
    const changed = D.fields[p.after.type].filter(([key]) => (p.before[key] || '') !== (p.after[key] || ''));
    const imageChange = JSON.stringify(p.before.assets) !== JSON.stringify(p.after.assets);
    return `<section class="proposal"><span class="tag">待你批准</span><h3 style="margin-top:10px">修改${D.names[p.after.type]}：${e(p.before.question)}</h3>${p.error ? `<p class="danger">${e(p.error)}</p>` : ''}<div id="change-summary">${changed.map(([key, label]) => `<div class="review-row"><strong>${label}</strong><small>原内容：${e(p.before[key] || '空')}</small><p>${e(p.after[key] || '清空')}</p></div>`).join('')}${imageChange ? '<p>图片已调整</p>' : ''}${!changed.length && !imageChange ? '<p>无修改</p>' : ''}</div><details><summary>编辑建议</summary><section class="capture-images">${images(p.after, 'proposal')}</section>${fields(p.after, 'proposal')}</details><div class="actions">${button('批准并保存修改', 'approve', '', 'primary')}${button('拒绝', 'reject')}</div>${p.error ? button('重新读取卡片', 'refresh-proposal') : ''}</section>`;
  }
  function agent() {
    return `${s.chat.map(message => `<div class="message ${message.role}">${e(message.text)}${message.cardId ? `<div style="margin-top:10px">${button("打开已保存的卡片", "agent-result", message.cardId)}</div>` : ""}${message.search ? `<div class="source-result"><strong>来源（模拟）</strong><p><a href="https://zh.wikipedia.org/wiki/%E5%AF%BC%E6%95%B0" target="_blank" rel="noopener noreferrer">导数 · 维基百科</a></p></div>` : ''}</div>`).join('')}${proposal()}`;
  }
  D.views = { main: () => ({ list, editor, detail, builder, activity, settings: D.settings.render }[s.view] || list)(), agent, proposal, button, card, activeJob, fields, pendingMistake };
})();
