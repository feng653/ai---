(() => {
  const D = window.FlowDemo, s = D.state, e = D.escape;
  const keys = new Map();
  s.providers ||= [
    { id: 'codex', name: 'Codex', kind: 'login', configured: false },
    { id: 'deepseek', name: 'DeepSeek', kind: 'api', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', configured: false },
  ];
  let selected = s.activeProvider || 'codex', notice = '';
  const busy = false;
  const provider = () => s.providers.find(item => item.id === selected) || s.providers[0];
  function render() {
    const item = provider();
    return `<div class="page-head"><h1>AI 供应商</h1></div><div class="provider-layout"><section class="panel provider-picker" aria-label="供应商">${s.providers.map(item => `<button data-setting="select" data-provider="${e(item.id)}" aria-pressed="${item.id === selected}">${e(item.name)}${s.activeProvider === item.id ? '<small>当前</small>' : ''}</button>`).join('')}<button data-setting="add">＋ 自定义 API</button></section>
      <section class="panel"><div class="page-head"><h2>${e(item.name)}</h2><span class="tag">${item.configured ? '已配置（模拟）' : '未配置'}</span></div>
      ${item.kind === 'login' ? `<button class="primary" data-setting="login" ${busy ? 'disabled' : ''}>${busy ? '登录中（模拟）' : '登录（模拟）'}</button>` : `<form id="provider-form"><fieldset class="provider-fields" ${busy ? 'disabled' : ''}><label>名称<input name="name" value="${e(item.name)}" required></label><label>Base URL<input name="baseUrl" type="url" value="${e(item.baseUrl)}" required></label><label>模型<input name="model" value="${e(item.model)}" required></label><label>API Key（仅本次）<input name="apiKey" type="password" autocomplete="off" value="${e(keys.get(item.id) || '')}"></label><div class="actions"><button type="button" data-setting="test">测试（模拟）</button><button class="primary" type="submit">保存</button></div></fieldset></form>`}
      ${notice ? `<p class="settings-notice" role="status">${e(notice)}</p>` : ''}<div class="save-bar">${item.configured && s.activeProvider !== item.id ? '<button data-setting="activate">设为当前</button>' : ''}${item.configured ? '<button data-setting="disconnect">断开</button>' : ''}</div></section></div>`;
  }
  function input() {
    const form = document.getElementById('provider-form'); if (!form?.reportValidity()) return null;
    const data = Object.fromEntries(new FormData(form));
    if (!['http:', 'https:'].includes(new URL(data.baseUrl).protocol)) { form.elements.baseUrl.setCustomValidity('地址须使用 HTTP 或 HTTPS'); form.reportValidity(); return null; }
    if (!data.model.trim() || !data.name.trim()) { notice = '名称和模型不能为空'; return null; }
    return data;
  }
  function refresh() { document.getElementById('main').innerHTML = render(); }
  document.addEventListener('click', event => {
    const node = event.target.closest('[data-setting]'); if (!node || busy) return;
    const action = node.dataset.setting; notice = '';
    if (action === 'select') selected = node.dataset.provider;
    if (action === 'add') { selected = D.uid('api'); s.providers.push({ id: selected, name: '自定义 API', kind: 'api', baseUrl: '', model: '', configured: false }); }
    if (action === 'activate') s.activeProvider = provider().id;
    if (action === 'disconnect') { provider().configured = false; keys.delete(provider().id); if (s.activeProvider === provider().id) s.activeProvider = ''; }
    if (action === 'test') {
      const data = input(); if (!data) { if (notice) document.querySelector('.settings-notice')?.remove(); return; }
      keys.set(provider().id, data.apiKey); Object.assign(provider(), { name: data.name, baseUrl: data.baseUrl, model: data.model });
      notice = '模拟完成 · 未联网';
    }
    if (action === 'login') { provider().configured = true; s.activeProvider = provider().id; notice = '模拟登录完成'; }
    D.persist(); refresh();
  });
  document.addEventListener('input', event => { if (event.target.closest('#provider-form')) event.target.setCustomValidity(''); });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'provider-form') return;
    event.preventDefault(); const data = input(); if (!data) return;
    keys.set(provider().id, data.apiKey);
    Object.assign(provider(), { name: data.name.trim(), baseUrl: data.baseUrl.trim(), model: data.model.trim(), configured: true });
    s.activeProvider = provider().id; notice = D.persist() ? '已保存（Key 仅本次）' : '保存失败'; refresh();
  });
  D.settings = { render };
})();
