(() => {
  const fields = {
    mistake: [['subject', '学科'], ['chapter', '章节'], ['question', '题目'], ['userAnswer', '我的答案'], ['answer', '正确答案'], ['solution', '正确解法'], ['errorLocation', '第一处错误'], ['errorReason', '错误原因'], ['errorType', '错误类型'], ['points', '知识点'], ['note', '补充说明']],
    practice: [['subject', '学科'], ['chapter', '章节'], ['question', '题目'], ['answer', '参考答案'], ['solution', '解法'], ['points', '知识点'], ['note', '补充说明']],
    knowledge: [['subject', '学科'], ['chapter', '章节'], ['question', '标题'], ['body', '知识内容'], ['points', '知识点'], ['note', '补充说明']],
  };
  const names = { mistake: '错题', practice: '复习问答', knowledge: '知识卡' };
  function initial() {
    return {
      page: 'mistake', view: 'list', query: '', editorId: '', detailId: '', drafts: {}, jobs: [],
      selected: [], count: 3, difficulty: '持平', requirement: '', chat: [], reference: '', proposal: null,
      cards: [
        { id: 'm1', type: 'mistake', rev: 1, subject: '数学', question: '已知 f(x) = x³ − 3x，求函数的单调区间。', userAnswer: '在 (−∞, −1) 和 (1, +∞) 上递增。', answer: '(−∞, −1)、(1, +∞) 上递增，(−1, 1) 上递减。', solution: '求导得到 f′(x) = 3x² − 3。用 −1、1 将定义域分段，分别判断导数符号。', errorLocation: '遗漏递减区间。', errorReason: '只记录了导数为正的区间。', errorType: '遗漏条件', points: '导数与单调性', note: '先画完整的符号表，再写结论。', assets: [], updated: '示例 · 今天' },
        { id: 'm2', type: 'mistake', rev: 1, subject: '数学', question: '求函数 y = √(x − 2) / (x − 3) 的定义域。', userAnswer: 'x ≥ 2', answer: '[2, 3) ∪ (3, +∞)', solution: '同时满足 x − 2 ≥ 0 和 x − 3 ≠ 0，取交集。', errorLocation: '未排除分母为零。', errorReason: '只检查了根式条件。', errorType: '遗漏条件', points: '函数定义域', note: '', assets: [], updated: '示例 · 昨天' },
        { id: 'k1', type: 'knowledge', rev: 1, subject: '数学', question: '用导数判断单调性', body: '先确定定义域，再求导并找出临界点。按临界点分段判断导数符号，最后写出所有单调区间。', points: '导数与单调性', note: '检查端点与不连续点。', assets: [], updated: '示例 · 昨天' },
        { id: 'p1', type: 'practice', rev: 1, subject: '数学', practiceKind: 'error-recall', promptContext: '已知 f(x) = x³ − 3x，求函数的单调区间。', question: '为什么只写导数为正的区间，不能完整回答单调区间问题？', answer: '还要报告导数为负的递减区间；完整检查所有分段，避免遗漏。', solution: '来源错题在 (−1, 1) 上导数为负，这段递减区间也需要写出。', points: '导数与单调性', note: '示例 · 错因概念问答', sources: ['m1'], assets: [], updated: '示例 · 今天' },
      ],
    };
  }
  const key = 'zhishi-learning-flow-upgrade-v1';
  let state;
  try { state = JSON.parse(localStorage.getItem(key)) || initial(); } catch { state = initial(); }
  state.treePath ||= [];
  state.cards.forEach(item => { if (!item.chapter) item.chapter = item.points === '导数与单调性' ? '导数及其应用' : item.points === '函数定义域' ? '函数的概念' : ''; });
  Object.values(state.drafts).forEach(item => { if (!item.chapter) item.chapter = state.cards.find(card => card.id === item.id)?.chapter || ''; });
  state.selected = state.selected.filter(id => state.cards.some(item => item.id === id && item.type === 'mistake'));
  state.jobs.forEach(job => { if (job.status === 'running') { job.status = 'interrupted'; job.error = '上次关闭时操作尚未完成，可重试。'; } });
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(state)); return true; }
    catch { return false; }
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  window.FlowDemo = { fields, names, state, persist, escape, uid, copy: value => JSON.parse(JSON.stringify(value)) };
})();
