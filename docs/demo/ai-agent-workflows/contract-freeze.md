# AI 生成与卡片交互合约冻结清单

> 版本：0.4  
> 日期：2026-09-04  
> 状态：产品交互已冻结；数值参数待工程评审  
> 关联 PRD：[知拾统一 AI Agent 与知识驱动练习生成 PRD](../../AI生成练习卡-PRD.md)

本文件是进入生产设计与实现前的权威边界。旧文档中与本版本冲突的“来源快照”“每张来源至少一题”“AI 质量复核”“练习流程创建知识点”均已撤回。

## 1. 状态定义

- **FROZEN**：产品语义不可在实现时自行改变。
- **PARAMETER**：结构已确定，具体数值可在工程评审中调整。
- **OUT**：V1 明确不做。

## 2. 产品决策

| ID | 状态 | 决策 | 验收含义 |
|---|---|---|---|
| PD-01 | FROZEN | 所有 AI 生成进入一个全局浮动 Agent | 页面不直接调用模型或拥有第二套运行状态机 |
| PD-02 | FROZEN | 结构化输入使用 Agent 外部的独立平面设置窗 | 设置窗与 Agent 平级，不嵌套在对话窗内 |
| PD-03 | FROZEN | 主内容区承担卡片选择和提案审核 | Agent 只展示计划、进度、错误、摘要和结果入口 |
| PD-04 | FROZEN | 手工编辑不依赖 AI | Agent/Provider 不可用时仍可创建、编辑、保存和删除 |
| PD-05 | FROZEN | 一个会话同一时刻只有一个主要任务 | V1 没有用户可见子 Agent、并行任务队列或递归委派 |
| PD-06 | FROZEN | 知识卡是独立对象 | 不再按知识点聚合成一张固定结构卡 |
| PD-07 | FROZEN | 知识卡采用自由正文 | 标题必填；正文可空；只有一个可选类型；知识点关系不限数量 |
| PD-08 | FROZEN | 空正文卡保存为“待补充” | 待补充卡不可选择为练习来源 |
| PD-09 | FROZEN | 知识卡 AI 新建只允许错题来源 | “生成知识卡”选择器不提供知识卡、笔记或全知识点输入 |
| PD-10 | FROZEN | 练习来源允许知识卡、错题或混合 | 至少选择一张具体卡片；不强制包含知识卡 |
| PD-11 | FROZEN | 禁止按知识点自动扩展上下文 | 只把用户明确勾选卡片的完整内容放入请求 |
| PD-12 | FROZEN | 删除来源快照和用户来源追溯 | 只保留内部 `type + id + revision` 诊断引用；详情不展示来源 |
| PD-13 | FROZEN | 练习不能创建知识点 | 生成、编辑和 Agent 修改均只能关联至少一个已有知识点 |
| PD-14 | FROZEN | 多知识卡提案逐卡审核 | 主区一次展示一张；可编辑、拒绝、重写、保存并看下一张 |
| PD-15 | FROZEN | 拆分/合并输出为新卡 | 原卡不会随提案保存而自动删除 |
| PD-16 | FROZEN | 练习批次一次计划审批 | 批准后授权生成、结构修复与事务保存整批，不逐题审批 |
| PD-17 | FROZEN | 练习只做确定性结构校验 | 禁止 AI 审核 AI 的正确性、可解性、难度、覆盖或语义质量 |
| PD-18 | FROZEN | 结构错误返回同一 Agent | 只修复失败卡，最多自动 3 轮；通过卡保持不变；无部分入库 |
| PD-19 | FROZEN | 练习核心为翻面卡 | 正面题目；反面答案、解析、训练重点和知识点；无答案输入 |
| PD-20 | FROZEN | 掌握状态三选一 | `未标记 | 有疑问 | 已掌握`；即时保存；重复点击当前状态重置 |
| PD-21 | FROZEN | 题库一页一个批次 | 当前批次单列宽卡；上一批/下一批切换 |
| PD-22 | FROZEN | 勾选只在批量管理模式出现 | 默认整卡进入复习；管理模式整卡只切换选择 |
| PD-23 | FROZEN | 删除为永久事务操作 | 删除选中/本批均二次确认；无撤销/回收站；空批次移除 |
| PD-24 | FROZEN | 后台完成不自动导航或抢焦点 | 只原地更新结果（若已在结果页）或更新 Agent 状态并轻提示 |
| PD-25 | FROZEN | 收起按钮显示完整 AI 状态 | 文字覆盖配置、进度、待审核数、修复轮次、失败和完成；徽标只辅助 |

## 3. 领域数据合约

### 3.1 FlexibleKnowledgeCard

```ts
type FlexibleKnowledgeCard = {
  id: string;
  title: string;
  body: string;
  completeness: "ready" | "incomplete";
  typeId?: string;
  knowledgePointIds: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
};
```

冻结约束：

- `title.trim()` 非空；`body` 可以为空。
- `body.trim()` 为空时 `completeness = "incomplete"`，UI 显示“待补充”。
- `typeId` 最多一个，可引用内置或自定义类型，不改变正文 Schema。
- `knowledgePointIds` 不设产品数量上限；知识点只用于组织，不代表 AI 上下文。
- 更新必须携带目标卡的 `expectedRevision`；保存成功 revision 增加。
- 列表默认按 `updatedAt DESC`，支持文本、知识树、类型组合筛选。

### 3.2 KnowledgeCardType

```ts
type KnowledgeCardType = {
  id: string;
  name: string;
  kind: "builtin" | "custom";
};
```

- 内置示例：概念、方法、易错细节、例子、清单。
- 自定义类型名称规范化后不得重复。
- 若类型仍被卡片使用，删除请求必须失败；用户需先重新分配或取消类型。

### 3.3 InternalSourceRef

```ts
type InternalSourceRef = {
  sourceType: "mistake_card" | "knowledge_card";
  sourceId: string;
  sourceRevision: number;
};
```

- 仅用于诊断、幂等和重复任务分析，不是用户可见来源功能。
- 不保存 `title`、`body`、`excerpt`、附件或其他正文快照。
- 模型请求提交时必须包含所选卡片的完整内容；完成后不重新校验来源正文或 revision。
- 来源卡后来修改或删除，不使已生成练习失效，也不在练习详情显示变化提示。

### 3.4 PracticeCard

```ts
type PracticeLearningStatus = "unmarked" | "doubt" | "mastered";

type PracticeCard = {
  id: string;
  batchId: string;
  question: string;
  correctAnswer: string;
  solution: string;
  trainingFocus?: string;
  knowledgePointIds: string[];
  learningStatus: PracticeLearningStatus;
  internalSourceRefs: InternalSourceRef[];
  revision: number;
  createdAt: string;
  updatedAt: string;
};
```

- `knowledgePointIds` 至少一个，且每个 ID 必须已经存在。
- 任何练习卡写路径都没有“创建知识点”能力。
- `learningStatus` 三值互斥，默认 `unmarked`；状态更新不增加内容 revision。
- 手工/Agent 提案更新题目内容时，保持当前 `learningStatus`。

### 3.5 PracticeBatch

```ts
type PracticeBatch = {
  id: string;
  title: string;
  status: "generating" | "repairing" | "completed" | "failed" | "deleted";
  sourceRefs: InternalSourceRef[];
  requestedCount: number;
  savedCount: number;
  difficulty: "basic" | "medium" | "advanced";
  templateId?: string;
  templateRevision?: number;
  customInstruction?: string;
  provider: string;
  promptVersion: string;
  createdAt: string;
  completedAt?: string;
};
```

- 每次成功生成对应一个稳定唯一批次 ID。
- `sourceRefs` 可全为知识卡、全为错题或混合，但至少一项。
- `requestedCount` 不受来源数量下限约束。
- 校验通过后一次事务写入批次和全部练习；失败不得留下半批完成数据。
- 旧练习归入兼容批次 `legacy`，可清理但不补造生成元数据。

## 4. Agent 与任务状态合约

```ts
type TaskKind =
  | "chat"
  | "organize_mistake"
  | "compose_knowledge_cards"
  | "edit_knowledge_card"
  | "generate_practice_batch"
  | "edit_practice_card"
  | "delete_content";

type TaskStatus =
  | "drafting"
  | "waiting_user"
  | "waiting_approval"
  | "running"
  | "repairing"
  | "review_ready"
  | "failed"
  | "succeeded"
  | "cancelled"
  | "interrupted";
```

主要转换：

```text
drafting → waiting_user | waiting_approval
waiting_approval → running | cancelled
running → repairing | review_ready | succeeded | failed | interrupted | cancelled
repairing → running | succeeded | failed | cancelled
review_ready → succeeded | cancelled
failed | interrupted → drafting | running | cancelled
```

- `succeeded` 和 `cancelled` 不能回到 `running`。
- 新计划/提案版本使旧版本 `superseded`；旧审批不可执行。
- 收起或切页不取消任务；应用退出后原 `running/repairing` 恢复为 `interrupted`。
- 会话、任务、输入草稿、检查点、提案、审批、工具摘要和运行状态持久化到本地。

### 4.1 收起按钮状态

```ts
type AgentLauncherState = {
  taskId?: string;
  status: TaskStatus | "idle";
  label: string;
  badge?: string;
  livePriority: "polite" | "assertive";
};
```

推荐映射：

| 任务状态 | `label` 示例 | 徽标 |
|---|---|---|
| idle | 准备就绪 | 无 |
| drafting | 配置中 | 无 |
| waiting_approval | 待批准 1 | 1 |
| running | 生成中 2/6 | 2/6 |
| repairing | 修复中 1/3 | 1 |
| review_ready | 待审核 3 | 3 |
| failed | 失败 · 待处理 | `!` |
| succeeded | 已完成 · 待查看 | `✓` |

- `label` 与徽标组成一个原子化可访问状态，不能让读屏只读出裸数字。
- 颜色不是唯一状态信号。
- 后台完成不调用路由跳转、不改变主区选择、不翻转练习卡、不抢焦点。

## 5. 输入窗与上下文合约

```ts
type GenerationInputDraft = {
  taskId: string;
  taskVersion: number;
  kind: "organize_mistake" | "compose_knowledge_cards" | "generate_practice_batch";
  selectedRefs: InternalSourceRef[];
  values: Record<string, string | number | boolean | string[]>;
  updatedAt: string;
};
```

- 设置窗是 Agent 的兄弟浮层；桌面可并排，窄屏在设置窗与 Agent 间切换。
- 修改草稿不调用模型、不创建提案、不授权写入。
- 设置窗显示来源数量和“选择来源”；完整选择器在主内容区。
- 提交才创建任务版本；“调整设置”恢复既有值并使旧计划/提案过期。
- 用户可通过自定义提示词控制本次输出；它是非可信输入，不能扩大来源、写入权限或绕过结构 Schema。

来源规则：

| 任务 | 允许来源 | 禁止行为 |
|---|---|---|
| 整理错题 | 当前明确错题 | 自动读取同知识点其他卡 |
| 新建知识卡 | 一张或多张明确错题 | 选择知识卡、笔记或整个知识点 |
| 编辑知识卡 | 当前明确知识卡 | 自动读取同知识点其他知识卡 |
| 生成练习 | 知识卡和/或错题 | 要求知识卡必选、按知识点扩展 |
| 编辑练习 | 当前明确练习卡 | 读取整个批次或创建知识点 |

## 6. 结果与审核合约

### 6.1 MistakeCardProposal

```ts
type MistakeCardProposal = {
  proposalId: string;
  proposalVersion: number;
  cardId: string;
  expectedRevision: number;
  changes: Array<{ field: string; before?: string; after: string }>;
};
```

- 主内容区按字段显示当前值与建议值，每项有独立勾选。
- “应用选中建议”只进入普通编辑草稿；用户显式保存才创建 revision。
- 错题保存后可启动独立的“基于此错题生成知识卡”，默认选中当前错题，并可添加其他错题。

### 6.2 KnowledgeCardProposalSet

```ts
type KnowledgeCardProposalSet = {
  proposalSetId: string;
  proposalVersion: number;
  splitRationale: string;
  proposals: Array<{
    proposalId: string;
    targetCardId?: string;
    expectedRevision?: number;
    title: string;
    body: string;
    typeId?: string;
    knowledgePointIds: string[];
  }>;
};
```

- 新建数量默认由 Agent 自动拆分并允许最大值；用户也可指定精确 1–10 张。
- 计划必须展示数量与拆分理由。
- 每个提案独立 `pending | rejected | saved | stale | superseded`。
- 主区单卡审核，顶部显示 `N/总数` 和各卡状态；保存当前编辑版本。
- 拆分和合并创建新卡；删除原卡必须是另一个明确确认操作。

### 6.3 PracticeBatchPlan

```ts
type PracticeBatchPlan = {
  planId: string;
  planVersion: number;
  sourceRefs: InternalSourceRef[];
  requestedCount: number;
  difficulty: PracticeBatch["difficulty"];
  template?: { id: string; expectedRevision: number; name: string };
  customInstruction?: string;
  sideEffectSummary: "generate_repair_and_save_batch";
};
```

- 审批界面展示来源数量、题量、难度、模板、补充要求和“结构通过后自动入库”。
- 一次批准授权生成、最多 3 次结构修复和事务保存。
- 计划不承诺 AI 质量审核或逐题预览。

## 7. 确定性结构校验与修复循环

```ts
type PracticeValidationError = {
  candidateIndex: number;
  candidateId?: string;
  field: "batch" | "id" | "question" | "correctAnswer" | "solution" | "knowledgePointIds" | "formula";
  code: string;
  message: string;
};
```

允许的校验只有：

1. 候选数量严格等于批准数量。
2. `question`、`correctAnswer`、`solution` 非空。
3. 至少一个知识点 ID，且全部已经存在。
4. 字段类型和长度在 Schema/参数范围内。
5. 公式可被当前渲染器解析。
6. 卡片 ID 在批内和存储中唯一。
7. 同批标准化题干没有精确重复。

明确不校验：

- 题目是否可解、答案是否正确、解析是否与答案一致。
- 难度是否符合、自定义提示是否被“高质量”遵循。
- 语义重复、知识细节覆盖或每个来源的出题数量。
- 来源正文或 revision 是否在生成期间变化。
- 任何由另一个 AI 执行的“质量复核”。

修复算法：

```text
validate all candidates
  → no errors: transaction save entire batch
  → errors: send candidate + field + reason to same Agent
  → replace failed candidates only; preserve passed candidates
  → validate all candidates again
  → after 3 failed repair rounds: wait for retry / adjust / abandon
```

## 8. 卡片交互合约

### 8.1 知识卡

- 列表：等高双列摘要卡；整卡进入详情；V1 无批量模式。
- 详情：主内容区展示，不用模态框/抽屉；提供编辑、生成练习、交给 Agent、删除。
- 编辑：一个 Markdown/公式编辑器，编辑/预览切换，本地自动保存草稿，显式保存 revision。
- 知识点管理：可搜索的学科→章节→知识点层级选择器；手工编辑可新建。
- “交给 Agent”：展开、压缩、改写、拆分、合并只读取当前卡。

### 8.2 练习卡

- 批次页：批次摘要 + 单列宽卡；卡片显示题目摘要、知识点和掌握状态。
- 复习：固定顺序翻面；回到列表保存批次、题号、正反面、状态和滚动。
- 全局状态筛选：全部/有疑问/已掌握/未标记；结果按批次弱分组。
- 编辑：题目、正确答案、解析、已有知识点均可改；保存 revision，不改掌握状态。
- Agent 修改：只读当前练习卡；主内容区逐字段比较并应用到编辑草稿。

### 8.3 批量管理和删除

- 默认无勾选框；进入管理模式后才出现。
- 管理工具条：全选/取消全选、删除选中、删除本批、退出。
- 删除前准确显示题量；删除永久且无撤销；事务失败不允许部分删除。
- 成功后退出管理；空批次移除并选择相邻批次。

## 9. 事件与错误

必要事件：`task_status`、`context_attached`、`artifact_created`、`artifact_superseded`、`tool_started`、`tool_completed`、`tool_failed`、`approval_required`、`approval_resolved`、`repair_started`、`checkpoint_saved`、`task_completed`。

- 前后端事件字段统一使用 `callId`，不得混用 `call_id`。
- 事件摘要不得记录卡片全文、完整自定义提示或凭据。
- UI 按 `taskId + taskVersion + callId` 隔离旧事件。

| 错误码 | 含义 | UI 行为 |
|---|---|---|
| `APPROVAL_STALE` | 审批绑定旧计划/提案 | 禁止执行，打开最新版本 |
| `TARGET_REVISION_CONFLICT` | 被编辑目标卡 revision 变化 | 重新读取目标并生成新提案 |
| `STRUCTURE_VALIDATION_FAILED` | 练习候选未通过允许的结构校验 | 返回字段错误并进入同 Agent 修复循环 |
| `REPAIR_LIMIT_REACHED` | 已连续失败 3 轮 | 等待用户重试、调整或放弃 |
| `RUN_INTERRUPTED` | 应用退出或运行中断 | 显示恢复或放弃，不自动续跑 |
| `AUTH_REQUIRED` | Provider 需要认证 | 保留任务草稿，认证后恢复 |
| `TRANSACTION_FAILED` | 整批保存/删除失败 | 不显示部分成功，不留下半批状态 |

## 10. 参数项

| ID | 状态 | 参数 | 最迟时间 |
|---|---|---|---|
| PA-01 | PARAMETER | 正文、提示模板和单次补充字符上限 | API Schema 定稿前 |
| PA-02 | PARAMETER | 最近消息窗口与摘要触发 token 阈值 | 上下文实现前 |
| PA-03 | PARAMETER | 单批练习上限；知识卡提案精确数量已冻结为 1–10 | 生成工具实现前 |
| PA-04 | PARAMETER | 会话保留期限、归档和删除策略 | 会话表发布前 |
| PA-05 | PARAMETER | 人工质量评测集的目标阈值 | 发布评估前 |

## 11. V1 范围外

- **OUT**：多个用户可见 Agent、子 Agent、递归委派和并行任务控制台。
- **OUT**：应用退出后继续模型请求。
- **OUT**：任意 Shell、SQL、文件系统或开放网络工具。
- **OUT**：来源正文快照、用户可见来源追溯或来源变更提醒。
- **OUT**：AI 自动评判 AI 输出质量。
- **OUT**：练习生成/编辑/Agent 创建新知识点。
- **OUT**：在线作答、自动判分、考试真题替代或押题承诺。
- **OUT**：练习逐题生成前预览与审批。
- **OUT**：知识卡批量管理。

## 12. 原型验收映射

| 原型操作 | 验证决策 |
|---|---|
| 知识卡列表→详情→编辑 | PD-06～PD-08、8.1 |
| 知识卡/练习设置窗→主区来源选择 | PD-02、PD-03、PD-09～PD-13 |
| Agent 结果→主区逐卡审核 | PD-14、PD-15、6.2 |
| 练习批次→翻面→标记状态 | PD-19～PD-21、8.2 |
| 进入批量管理→全选/删除 | PD-22、PD-23、8.3 |
| 批准计划→结构报错→同 Agent 修复 | PD-16～PD-18、7 |
| 生成中收起 Agent | PD-25、4.1 |
| 后台完成时停留原页面 | PD-24、4.1 |

## 13. 进入生产实现的门槛

- [ ] 三条端到端旅程各完成一次无引导走查。
- [ ] 用户理解设置窗不在 Agent 内，来源选择和提案审核在主内容区。
- [ ] 用户能区分知识卡逐卡保存与练习计划一次批准自动入库。
- [ ] 用户能从收起按钮读懂当前状态，不依赖颜色或打开 Agent。
- [ ] 后台完成不会改变当前路由、卡片、翻面或焦点。
- [ ] 所有写工具都有审批、目标 revision、幂等与事务测试。
- [ ] 结构校验测试明确断言“不执行 AI 质量复核”和“不执行来源二次校验”。
- [ ] 练习所有写路径都没有创建知识点权限。
