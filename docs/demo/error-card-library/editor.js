function updateAiState() {
      $('aiStatusBtn').classList.toggle('connected', codexConnected);
      $('aiStatusText').textContent = codexConnected ? 'Codex 已连接' : 'AI 未连接';
      $('inlineAiState').textContent = codexConnected ? 'Codex 已连接' : '当前未连接';
      $('aiBoxTitle').textContent = codexConnected ? '使用 Codex 自动完成整理' : '连接 Codex，自动完成整理';
    }

    function setOverlay(id, open) {
      $(id).classList.toggle('open', open);
      document.body.style.overflow = document.querySelector('.overlay.open, .modal-overlay.open') ? 'hidden' : '';
    }

    function clearEditor() {
      currentCardId = null;
      currentTags = [];
      uploadedImage = '';
      ['questionInput','userAnswerInput','correctAnswerInput','solutionInput','errorLocationInput','errorReasonInput'].forEach(id => $(id).value = '');
      $('errorTypeInput').value = '';
      $('imagePreview').src = '';
      $('dropzone').classList.remove('has-image');
      $('resultNote').classList.remove('show');
      $('progressBox').classList.remove('show');
      $('aiBox').style.display = 'flex';
      $('deleteInEditor').style.display = 'none';
      $('editorTitle').textContent = '新增错题';
      $('editorSub').textContent = '先保存原始材料，也可以稍后再整理';
      renderKnowledgeEditor();
      editorDirty = false;
    }

    function openEditor(card = null) {
      clearEditor();
      if (card) {
        currentCardId = card.id;
        currentTags = [...card.tags];
        $('questionInput').value = card.question;
        $('userAnswerInput').value = card.userAnswer;
        $('correctAnswerInput').value = card.correctAnswer;
        $('solutionInput').value = card.solution;
        $('errorLocationInput').value = card.errorLocation;
        $('errorReasonInput').value = card.errorReason;
        $('errorTypeInput').value = card.errorType;
        $('editorTitle').textContent = '编辑错题';
        $('editorSub').textContent = `卡片 #${card.id} · 修改后需要重新保存`;
        $('deleteInEditor').style.display = '';
        renderKnowledgeEditor();
      }
      setOverlay('detailOverlay', false);
      setOverlay('editorOverlay', true);
      setTimeout(() => $('questionInput').focus(), 280);
    }

    function closeEditor(force = false) {
      if (editorDirty && !force && !window.confirm('当前有未保存的修改，确定离开吗？')) return;
      setOverlay('editorOverlay', false);
      editorDirty = false;
    }

    function fillDemo() {
      $('questionInput').value = '解不等式：x² > 4。';
      $('userAnswerInput').value = '因为 x² > 4，所以 x > 2。';
      $('correctAnswerInput').value = '';
      $('solutionInput').value = '';
      $('errorLocationInput').value = '';
      $('errorReasonInput').value = '';
      $('errorTypeInput').value = '';
      currentTags = [];
      renderKnowledgeEditor();
      editorDirty = true;
      toast('已填入演示题目，可以尝试 AI 整理');
    }

    function renderKnowledgeEditor() {
      const editor = $('knowledgeEditor');
      editor.querySelectorAll('.k-tag').forEach(el => el.remove());
      currentTags.forEach((tag, index) => {
        const chip = document.createElement('span');
        chip.className = 'k-tag';
        chip.innerHTML = `${escapeHtml(tag)} <button type="button" data-index="${index}">×</button>`;
        editor.insertBefore(chip, $('tagInput'));
      });
      editor.querySelectorAll('.k-tag button').forEach(btn => btn.addEventListener('click', () => {
        currentTags.splice(Number(btn.dataset.index), 1);
        editorDirty = true;
        renderKnowledgeEditor();
      }));
    }

    function addTag(value) {
      const tag = value.trim();
      if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
        editorDirty = true;
        renderKnowledgeEditor();
      }
      $('tagInput').value = '';
    }

    function openConnect(pending = null) {
      pendingAiAction = pending;
      $('connectDefault').style.display = '';
      $('connectSuccess').style.display = 'none';
      $('connectTitle').textContent = codexConnected ? 'Codex 连接状态' : '连接 Codex';
      $('connectSub').textContent = codexConnected ? 'AI 整理能力当前可用，你也可以随时断开连接。' : '连接是可选的。未连接时，你仍然可以手动使用全部基础功能。';
      $('connectBtn').textContent = codexConnected ? '断开连接' : '连接 Codex';
      $('manualContinueBtn').textContent = codexConnected ? '关闭' : '继续手动填写';
      setOverlay('connectModal', true);
    }

    function handleConnect() {
      if (codexConnected) {
        codexConnected = false;
        updateAiState();
        setOverlay('connectModal', false);
        toast('已断开 Codex，手动功能仍可使用');
        return;
      }
      $('connectBtn').disabled = true;
      $('connectBtn').textContent = '正在验证…';
      setTimeout(() => {
        codexConnected = true;
        updateAiState();
        $('connectDefault').style.display = 'none';
        $('connectSuccess').style.display = 'block';
        $('connectFooter').style.display = 'none';
        setTimeout(() => {
          setOverlay('connectModal', false);
          $('connectFooter').style.display = 'flex';
          $('connectBtn').disabled = false;
          $('connectBtn').textContent = '连接 Codex';
          toast('Codex 已连接，AI 能力现已可用');
          const action = pendingAiAction;
          pendingAiAction = null;
          if (action) setTimeout(action, 220);
        }, 1050);
      }, 900);
    }

    function requestOrganize() {
      if (organizing) return;
      const hasInput = $('questionInput').value.trim() || uploadedImage;
      if (!hasInput) {
        toast('请先输入题目或添加题目图片');
        $('questionInput').focus();
        return;
      }
      if (!codexConnected) {
        openConnect(requestOrganize);
        return;
      }
      runAiOrganize();
    }

    function runAiOrganize() {
      organizing = true;
      $('aiBox').style.display = 'none';
      $('progressBox').classList.add('show');
      const stages = [
        ['正在读取题目…', 18, 0],
        ['正在分析你的答案…', 44, 1],
        ['正在定位第一处错误…', 70, 2],
        ['正在关联知识点…', 92, 3]
      ];
      stages.forEach((stage, i) => setTimeout(() => {
        $('progressTitle').textContent = stage[0];
        $('progressBar').style.width = stage[1] + '%';
        document.querySelectorAll('.progress-steps span').forEach((span, idx) => span.classList.toggle('active', idx <= stage[2]));
      }, i * 650));
      setTimeout(() => {
        const q = $('questionInput').value.trim();
        if (!q) $('questionInput').value = '解不等式：x² > 4。';
        if (!$('userAnswerInput').value.trim()) $('userAnswerInput').value = '因为 x² > 4，所以 x > 2。';
        $('correctAnswerInput').value = 'x > 2 或 x < −2';
        $('solutionInput').value = 'x² > 4 等价于 |x| > 2。因此 x 到原点的距离大于 2，解集为 x > 2 或 x < −2。';
        $('errorLocationInput').value = '由 x² > 4 推导为 x > 2 时，只保留了正数分支。';
        $('errorReasonInput').value = '忽略了 x < −2 的情况，说明在处理平方不等式时没有考虑绝对值对应的两个方向。';
        $('errorTypeInput').value = '方法错误';
        currentTags = ['一元二次不等式', '绝对值'];
        renderKnowledgeEditor();
        $('progressBar').style.width = '100%';
        $('progressTitle').textContent = '整理完成';
        setTimeout(() => {
          $('progressBox').classList.remove('show');
          $('aiBox').style.display = 'flex';
          $('resultNote').classList.add('show');
          organizing = false;
          editorDirty = true;
          toast('已生成整理建议，请确认后保存');
          $('resultNote').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }, stages.length * 650 + 150);
    }
