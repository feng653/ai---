const icons = {
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 11a8.5 8.5 0 1 1-4.2-7.3"/><path d="m9 11 2 2 9-9"/></svg>'
    };

    let cards = [
      {
        id: 1,
        subject: '数学',
        question: '解不等式：x² − 5x + 6 > 0。',
        userAnswer: '由 (x−2)(x−3)>0，得 2 < x < 3。',
        correctAnswer: 'x < 2 或 x > 3',
        solution: '先求方程 x²−5x+6=0 的两个根 2、3。二次项系数为正，函数图像开口向上，因此大于 0 的区间位于两根外侧，解集为 x<2 或 x>3。',
        errorLocation: '将二次函数大于 0 的区间判断成了两个根之间。',
        errorReason: '混淆了开口向上的二次函数在两根内外的符号规律。',
        errorType: '方法错误',
        tags: ['一元二次不等式', '函数图像'],
        status: 'done',
        time: '今天 09:42'
      },
      {
        id: 2,
        subject: '数学',
        question: '已知 f(x)=x³−3x，求函数的单调区间。',
        userAnswer: 'f′(x)=3x²−3，所以函数在 x>1 时单调递增。',
        correctAnswer: '递增区间为 (−∞,−1) 与 (1,+∞)，递减区间为 (−1,1)',
        solution: '令 f′(x)=3(x²−1)。当 x<−1 或 x>1 时，f′(x)>0；当 −1<x<1 时，f′(x)<0。',
        errorLocation: '解 f′(x)>0 时遗漏了 x<−1 的区间。',
        errorReason: '由 x²>1 推导时只保留了正数分支，没有考虑负数分支。',
        errorType: '推理或步骤错误',
        tags: ['导数', '函数单调性'],
        status: 'done',
        time: '昨天 21:16'
      },
      {
        id: 3,
        subject: '数学',
        question: '如图，在 △ABC 中，AB=AC，求证 ∠B=∠C。',
        userAnswer: '',
        correctAnswer: '',
        solution: '',
        errorLocation: '',
        errorReason: '',
        errorType: '',
        tags: ['全等三角形'],
        status: 'draft',
        time: '5月18日'
      },
      {
        id: 4,
        subject: '物理',
        question: '质量为 2 kg 的物体受到 10 N 的水平恒力，求其加速度。',
        userAnswer: 'a = Fm = 20 m/s²',
        correctAnswer: '5 m/s²',
        solution: '根据牛顿第二定律 F=ma，可得 a=F/m=10/2=5 m/s²。',
        errorLocation: '将 a=F/m 错写成 a=Fm。',
        errorReason: '公式变形错误，没有检查量纲。',
        errorType: '公式或定理使用错误',
        tags: ['牛顿第二定律'],
        status: 'done',
        time: '5月16日'
      },
      {
        id: 5,
        subject: '数学',
        question: '计算：log₂8 + log₂(1/4)。',
        userAnswer: '3 + 2 = 5',
        correctAnswer: '1',
        solution: 'log₂8=3，log₂(1/4)=log₂(2⁻²)=−2，因此结果为 3−2=1。',
        errorLocation: '计算 log₂(1/4) 时遗漏了负号。',
        errorReason: '没有将 1/4 正确写成 2 的负指数形式。',
        errorType: '计算错误',
        tags: ['对数运算'],
        status: 'done',
        time: '5月14日'
      }
    ];

    let codexConnected = false;
    let activeFilter = 'all';
    let activeTag = '';
    let currentCardId = null;
    let detailCardId = null;
    let pendingAiAction = null;
    let pendingDeleteId = null;
    let editorDirty = false;
    let currentTags = [];
    let uploadedImage = '';
    let organizing = false;

    const $ = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
