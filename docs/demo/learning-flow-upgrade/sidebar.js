(() => {
  const D = window.FlowDemo, s = D.state;
  function render() {
    document.body.classList.toggle('sidebar-collapsed', Boolean(s.sidebarCollapsed));
    const toggle = document.getElementById('sidebar-toggle');
    toggle.setAttribute('aria-expanded', String(!s.sidebarCollapsed));
    toggle.setAttribute('aria-label', s.sidebarCollapsed ? '展开侧栏' : '收起侧栏');
    toggle.title = s.sidebarCollapsed ? '展开侧栏' : '收起侧栏';
    toggle.textContent = s.sidebarCollapsed ? '›' : '‹';
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('#sidebar-toggle')) return;
    s.sidebarCollapsed = !s.sidebarCollapsed; render(); D.persist();
  });
  render();
})();
