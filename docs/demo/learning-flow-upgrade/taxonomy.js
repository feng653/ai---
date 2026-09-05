(() => {
  const D = window.FlowDemo, s = D.state, e = D.escape;
  const points = item => [...new Set((item.points || '').split(/[、,，\n]/).map(x => x.trim()).filter(Boolean))];
  const paths = item => (points(item).length ? points(item) : ['待归知识点']).map(point => [item.subject || '待归学科', item.chapter || '待归章节', point]);
  const matches = (item, path = s.treePath || []) => paths(item).some(parts => path.every((part, i) => part === parts[i]));
  const children = path => [...new Set(s.cards.filter(item => matches(item, path)).flatMap(item => paths(item).filter(parts => path.every((part, i) => parts[i] === part)).map(parts => parts[path.length])))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const encode = path => e(JSON.stringify(path));
  function branches(path = []) {
    return children(path).map(name => {
      const next = [...path, name], selected = JSON.stringify(s.treePath) === JSON.stringify(next);
      const count = s.cards.filter(item => item.type === (s.view === 'builder' ? 'mistake' : s.page) && matches(item, next)).length;
      const button = `<button type="button" id="tree-${e(encodeURIComponent(JSON.stringify(next)))}" data-path="${encode(next)}" aria-pressed="${selected}">${e(name)} <small>${count}</small></button>`;
      const expanded = s.treeOpen?.[JSON.stringify(next)] !== false;
      return next.length < 3 ? `<details data-tree-branch="${encode(next)}" ${expanded ? 'open' : ''}><summary>${e(name)}</summary>${button}<div class="tree-children">${branches(next)}</div></details>` : button;
    }).join('');
  }
  function render() {
    document.getElementById('classification-tree').innerHTML = `<button type="button" id="tree-all" data-path="[]" aria-pressed="${!s.treePath?.length}">全部分类</button>${branches()}`;
  }
  document.addEventListener('toggle', event => {
    const path = event.target.dataset?.treeBranch;
    if (path) { s.treeOpen ||= {}; s.treeOpen[path] = event.target.open; D.persist(); }
  }, true);
  D.taxonomy = { paths, matches, children, render };
})();
