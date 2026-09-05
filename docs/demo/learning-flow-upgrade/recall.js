(() => {
  const D = window.FlowDemo;
  function available(source) {
    if (!source.errorReason?.trim() && !source.errorLocation?.trim()) return [];
    const questions = [];
    if (source.errorReason) questions.push({ question: '当时为什么会出错？怎样识别这个错误？', answer: source.errorReason, basis: '错误原因' });
    if (source.errorLocation) questions.push({ question: '第一处错误在哪里？下次做到哪一步需要停下来检查？', answer: source.errorLocation, basis: '第一处错误' });
    if (source.note) questions.push({ question: '为了避免重犯，这道错题留下了什么检查方法？', answer: source.note, basis: '补充说明' });
    if (source.solution) questions.push({ question: `涉及「${source.points || '这道错题'}」，正确判断依赖哪些条件或规则？请解释理由。`, answer: source.solution, basis: '正确解法' });
    return questions;
  }
  function create(snapshot) {
    const pool = snapshot.sources.flatMap(source => available(source).map((question, position) => ({ source, ...question, position }))).sort((a, b) => a.position - b.position);
    return pool.slice(0, snapshot.count).map(({ source, question, answer, basis }) => ({
      id: D.uid('r'), type: 'practice', practiceKind: 'error-recall', rev: 1,
      subject: source.subject, chapter: source.chapter, points: source.points,
      question, promptContext: source.question || '图片错题', answer,
      solution: `依据：来源错题的「${basis}」。`,
      note: '',
      sources: [source.id], sourceRevisions: [source.rev], assets: [], updated: '刚刚生成',
    }));
  }
  D.recall = { available, create };
})();
