function toast(message) {
      const item = document.createElement('div');
      item.className = 'toast';
      item.innerHTML = icons.check + `<span>${escapeHtml(message)}</span>`;
      $('toastStack').appendChild(item);
      setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateY(7px)'; }, 2600);
      setTimeout(() => item.remove(), 2900);
    }

    function getAllTags() {
      const count = {};
      cards.forEach(card => card.tags.forEach(tag => count[tag] = (count[tag] || 0) + 1));
      return Object.entries(count).sort((a,b) => b[1] - a[1]);
    }

    function renderSidebarTags() {
      const topTags = getAllTags().slice(0, 4);
      $('sidebarTags').innerHTML = topTags.map(([tag, count]) => `
        <button class="tag-item ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
          <span class="tag-dot"></span><span>${escapeHtml(tag)}</span><span class="nav-count">${count}</span>
        </button>`).join('');
      document.querySelectorAll('.tag-item').forEach(btn => btn.addEventListener('click', () => {
        activeTag = activeTag === btn.dataset.tag ? '' : btn.dataset.tag;
        renderAll();
      }));
    }

    function renderCards() {
      const query = $('searchInput').value.trim().toLowerCase();
      const filtered = cards.filter(card => {
        const stateMatch = activeFilter === 'all' || card.status === activeFilter;
        const tagMatch = !activeTag || card.tags.includes(activeTag);
        const haystack = [card.question, card.errorReason, card.errorType, ...card.tags].join(' ').toLowerCase();
        return stateMatch && tagMatch && (!query || haystack.includes(query));
      });

      $('pageMeta').textContent = activeTag ? `${activeTag} · ${filtered.length} 张卡片` : `共 ${cards.length} 张卡片`;
      if (!filtered.length) {
        $('cardGrid').innerHTML = `
          <div class="empty">
            <div class="empty-icon"><svg width="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></svg></div>
            <h3>没有找到匹配的错题</h3>
            <p>换一个关键词或筛选条件，也可以直接录入一道新题。</p>
            <button class="btn btn-primary" onclick="openEditor()">新增错题</button>
          </div>`;
        return;
      }

      $('cardGrid').innerHTML = filtered.map(card => `
        <article class="card" data-id="${card.id}">
          <div class="card-top">
            <span class="subject">${escapeHtml(card.subject || '未分类')}</span>
            <span class="state ${card.status}">${card.status === 'done' ? '已整理' : '待完善'}</span>
          </div>
          <div class="question">${escapeHtml(card.question || '仅保存了原始题目图片')}</div>
          <div class="diagnosis">${escapeHtml(card.errorReason || '还没有错因诊断，可以手动完善或使用 AI 整理。')}</div>
          <div class="card-bottom">
            <div class="tags">${card.tags.length ? card.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '<span class="tag muted">未关联知识点</span>'}</div>
            <div class="card-time"><span>${escapeHtml(card.time)}</span><span class="error-badge">${escapeHtml(card.errorType || '未诊断')}</span></div>
          </div>
        </article>`).join('');
      document.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => openDetail(Number(card.dataset.id))));
    }

    function renderCounts() {
      const done = cards.filter(c => c.status === 'done').length;
      const draft = cards.length - done;
      $('allCount').textContent = cards.length;
      $('draftCount').textContent = draft;
      $('doneCount').textContent = done;
      $('chipAll').textContent = cards.length;
      $('chipDraft').textContent = draft;
      $('chipDone').textContent = done;
    }

    function renderAll() {
      renderCounts();
      renderSidebarTags();
      renderCards();
      document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === activeFilter));
    }
