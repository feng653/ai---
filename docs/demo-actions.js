function collectEditor(statusOverride = null) {
      const question = $('questionInput').value.trim();
      const hasOrganized = $('solutionInput').value.trim() && currentTags.length;
      return {
        id: currentCardId || Date.now(),
        subject: currentTags.some(t => ['牛顿第二定律','力学'].includes(t)) ? '物理' : '数学',
        question,
        userAnswer: $('userAnswerInput').value.trim(),
        correctAnswer: $('correctAnswerInput').value.trim(),
        solution: $('solutionInput').value.trim(),
        errorLocation: $('errorLocationInput').value.trim(),
        errorReason: $('errorReasonInput').value.trim(),
        errorType: $('errorTypeInput').value,
        tags: [...currentTags],
        status: statusOverride || (question && hasOrganized ? 'done' : 'draft'),
        time: currentCardId ? '刚刚修改' : '刚刚'
      };
    }

    function saveCard(asDraft = false) {
      const hasInput = $('questionInput').value.trim() || uploadedImage;
      if (!hasInput) {
        toast('至少需要输入题目或添加一张图片');
        return;
      }
      const card = collectEditor(asDraft ? 'draft' : null);
      if (currentCardId) {
        const idx = cards.findIndex(c => c.id === currentCardId);
        cards[idx] = card;
      } else {
        cards.unshift(card);
      }
      editorDirty = false;
      closeEditor(true);
      activeFilter = 'all';
      activeTag = '';
      $('searchInput').value = '';
      renderAll();
      toast(asDraft ? '已保存为待完善卡片' : '错题卡片已保存');
    }

    function openDetail(id) {
      const card = cards.find(c => c.id === id);
      if (!card) return;
      detailCardId = id;
      $('detailMeta').textContent = `${card.status === 'done' ? '已整理' : '待完善'} · ${card.time}`;
      $('detailBody').innerHTML = `
        <div class="detail-layout">
          <section class="detail-block">
            <div class="detail-label">题目</div>
            <div class="detail-question">${escapeHtml(card.question || '仅保存了原始图片')}</div>
          </section>
          <section class="detail-block">
            <div class="detail-label">作答对照</div>
            <div class="answer-grid">
              <div class="answer-box wrong"><div class="answer-label">我的答案</div><div class="answer-text">${escapeHtml(card.userAnswer || '未填写')}</div></div>
              <div class="answer-box correct"><div class="answer-label">正确答案</div><div class="answer-text">${escapeHtml(card.correctAnswer || '待补充')}</div></div>
            </div>
          </section>
          <section class="detail-block">
            <div class="detail-label">正确解法</div>
            <div class="answer-text">${card.solution ? escapeHtml(card.solution) : '<span class="empty-detail">还没有填写正确解法</span>'}</div>
          </section>
          <section class="detail-block diagnosis-panel">
            <div class="detail-label">错因诊断</div>
            <div class="diagnosis-row"><strong>第一处错误 · ${escapeHtml(card.errorType || '未分类')}</strong><p>${card.errorLocation ? escapeHtml(card.errorLocation) : '<span class="empty-detail">暂未定位错误位置</span>'}</p></div>
            <div class="diagnosis-row"><strong>为什么会错</strong><p>${card.errorReason ? escapeHtml(card.errorReason) : '<span class="empty-detail">尚未进行诊断，可手动填写或使用 AI 整理</span>'}</p></div>
          </section>
          <section class="detail-block">
            <div class="detail-label">关联知识点</div>
            <div class="tags">${card.tags.length ? card.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('') : '<span class="empty-detail">未关联知识点</span>'}</div>
          </section>
        </div>`;
      setOverlay('detailOverlay', true);
    }

    function editCurrentDetail() {
      const card = cards.find(c => c.id === detailCardId);
      if (card) openEditor(card);
    }

    function organizeDetail() {
      const card = cards.find(c => c.id === detailCardId);
      if (!card) return;
      if (!codexConnected) {
        openConnect(() => {
          openEditor(card);
          setTimeout(requestOrganize, 320);
        });
      } else {
        openEditor(card);
        setTimeout(requestOrganize, 320);
      }
    }

    function requestDelete(id) {
      pendingDeleteId = id;
      setOverlay('confirmModal', true);
    }

    function deleteConfirmed() {
      cards = cards.filter(card => card.id !== pendingDeleteId);
      setOverlay('confirmModal', false);
      setOverlay('detailOverlay', false);
      setOverlay('editorOverlay', false);
      editorDirty = false;
      pendingDeleteId = null;
      renderAll();
      toast('错题卡片已删除');
    }

    // 事件绑定
    $('newCardBtn').addEventListener('click', () => openEditor());
    $('closeEditor').addEventListener('click', () => closeEditor());
    $('closeDetail').addEventListener('click', () => setOverlay('detailOverlay', false));
    $('aiStatusBtn').addEventListener('click', () => openConnect());
    $('closeConnect').addEventListener('click', () => { pendingAiAction = null; setOverlay('connectModal', false); });
    $('manualContinueBtn').addEventListener('click', () => { pendingAiAction = null; setOverlay('connectModal', false); });
    $('connectBtn').addEventListener('click', handleConnect);
    $('organizeBtn').addEventListener('click', requestOrganize);
    $('demoFillBtn').addEventListener('click', fillDemo);
    $('saveCardBtn').addEventListener('click', () => saveCard(false));
    $('saveDraftBtn').addEventListener('click', () => saveCard(true));
    $('editDetailBtn').addEventListener('click', editCurrentDetail);
    $('detailAiBtn').addEventListener('click', organizeDetail);
    $('deleteDetailBtn').addEventListener('click', () => requestDelete(detailCardId));
    $('deleteInEditor').addEventListener('click', () => requestDelete(currentCardId));
    $('cancelDelete').addEventListener('click', () => setOverlay('confirmModal', false));
    $('confirmDelete').addEventListener('click', deleteConfirmed);
    $('searchInput').addEventListener('input', renderCards);
    $('tagInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTag(e.target.value); } });

    document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      activeTag = '';
      renderAll();
    }));

    document.querySelectorAll('.input-tab').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.input-tab').forEach(tab => tab.classList.toggle('active', tab === btn));
      $('imageInputPanel').style.display = btn.dataset.inputTab === 'image' ? '' : 'none';
      if (btn.dataset.inputTab === 'text') $('questionInput').focus();
    }));

    ['questionInput','userAnswerInput','correctAnswerInput','solutionInput','errorLocationInput','errorReasonInput','errorTypeInput'].forEach(id => {
      $(id).addEventListener('input', () => editorDirty = true);
    });

    $('dropzone').addEventListener('click', () => $('fileInput').click());
    $('dropzone').addEventListener('dragover', e => { e.preventDefault(); $('dropzone').classList.add('drag'); });
    $('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('drag'));
    $('dropzone').addEventListener('drop', e => {
      e.preventDefault(); $('dropzone').classList.remove('drag');
      const file = e.dataTransfer.files[0]; if (file) readImage(file);
    });
    $('fileInput').addEventListener('change', e => { if (e.target.files[0]) readImage(e.target.files[0]); });

    function readImage(file) {
      const reader = new FileReader();
      reader.onload = e => {
        uploadedImage = e.target.result;
        $('imagePreview').src = uploadedImage;
        $('dropzone').classList.add('has-image');
        editorDirty = true;
        toast('题目图片已添加');
      };
      reader.readAsDataURL(file);
    }

    [
      ['editorOverlay', () => closeEditor()],
      ['detailOverlay', () => setOverlay('detailOverlay', false)],
      ['connectModal', () => { pendingAiAction = null; setOverlay('connectModal', false); }],
      ['confirmModal', () => setOverlay('confirmModal', false)]
    ].forEach(([id, close]) => $(id).addEventListener('mousedown', e => { if (e.target === $(id)) close(); }));

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('searchInput').focus(); }
      if (e.key === 'Escape') {
        if ($('confirmModal').classList.contains('open')) setOverlay('confirmModal', false);
        else if ($('connectModal').classList.contains('open')) setOverlay('connectModal', false);
        else if ($('editorOverlay').classList.contains('open')) closeEditor();
        else if ($('detailOverlay').classList.contains('open')) setOverlay('detailOverlay', false);
      }
    });

    updateAiState();
    renderAll();
