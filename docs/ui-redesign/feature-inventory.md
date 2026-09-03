# 现有功能清单

本清单记录基线提交 `efeb38d86db04491fc134fae0592d5af37051df1` 中实际挂载的功能。优先级含义：P0 为核心数据或安全行为，P1 为主要任务流程，P2 为辅助体验。

> 2026-09-03 落地状态：[x] 54 / 54 项已映射并实现，[x] C-01～C-16 保持，[ ] 桌面真实 Provider/凭据/文件生命周期/Agent 写审批仍待实机。逐项状态以 [迁移矩阵](migration-matrix.md) 为准，验证结果见 [新 UI 验收记录](evidence/2026-09-03-new-ui-walkthrough.md)。本文件继续保留旧基线事实，避免覆盖迁移前证据。

## 应用框架与导航

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| NAV-001 | P1 | 通过侧栏进入“我的错题”“新增错题”“AI 接入”；通过顶部按钮快速新增或进入 AI 设置 | 当前路由高亮；未知路由回到首页；页面懒加载显示 loading | 使用 HashRouter，不写业务数据 | `src/App.tsx`、`src/components/AppShell.tsx`；人工待验 |
| NAV-002 | P1 | 收起和展开桌面侧栏；收起时点击品牌区可展开 | 展开、收起、刷新后恢复；按钮有 aria-label 和 title | `localStorage[zhishi:sidebar-collapsed]` | `AppShell.test.tsx` 测试覆盖 |
| NAV-003 | P2 | 在移动布局点击品牌返回首页 | 移动布局、窄窗口、页面内导航 | 不写业务数据 | `src/components/AppShell.tsx`；人工待验 |
| NAV-004 | P2 | 顶栏根据当前位置显示错题库、AI 设置或整理错题语境 | 首页、设置、详情/编辑等非首页路径 | 不写业务数据 | `src/components/AppShell.tsx`；人工待验 |

## 错题库与知识树

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| LIB-001 | P1 | 在首页查看按更新时间倒序排列的错题卡片 | loading、读取错误、无卡片、筛选无结果、正常列表 | 浏览器从本地存储读取；桌面通过 Tauri IPC 读取 | `RelatedCardsView.tsx`、卡片服务；测试部分覆盖，人工待验 |
| LIB-002 | P1 | 点击卡片或聚焦后按 Enter 打开详情 | 鼠标点击、键盘 Enter、焦点可见性 | 只导航，不写数据 | `RelatedCardsView.tsx`；人工待验 |
| LIB-003 | P1 | 查看卡片摘要：学科、整理状态、图片标记、题目、错因、知识点、更新时间、错误类型 | 图片卡、空题目、无诊断、无知识点、长公式和长文本 | 不写数据 | `RelatedCardsView.tsx`、`MathContent.tsx`；人工待验 |
| TREE-001 | P1 | 按“学科 → 章节 → 知识点”浏览知识树，并查看各层去重后的错题数 | 默认展开学科；有/无章节；空树 | 由当前卡片即时派生 | `knowledgeTree.test.ts` 测试覆盖 |
| TREE-002 | P1 | 点击任意层级筛选错题，再点同一项取消；底部可清除筛选 | 学科、章节、知识点三级选择；选中态；清除 | 筛选条件进入卡片查询，不写数据 | `KnowledgeTreeFilter.test.tsx`、`cardService.test.ts` 测试覆盖 |
| TREE-003 | P1 | 搜索学科、章节或知识点，并保留匹配项的祖先路径 | 输入、清除按钮、无匹配结果；搜索时匹配分支展开 | 仅本地派生状态 | `KnowledgeTreeFilter.test.tsx`、`knowledgeTree.test.ts` 测试覆盖 |
| LIB-004 | P1 | 在“关联错题 / 知识卡片 / 复习题”之间切换，并查看数量摘要 | tab 选中态；复习题禁用态；筛选变化 | 当前 tab 仅内存保存 | `KnowledgeContextView.test.tsx` 测试覆盖 |

## 卡片详情、创建与编辑

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| CARD-001 | P1 | 查看完整错题详情，包括原图、作答对照、正确解法、错因诊断、补充说明和知识点路径 | loading、找不到卡片、字段缺失、图片读取失败、Markdown/LaTeX | 只读取卡片和图片 | `CardDetailPage.tsx`、`AssetPreview.tsx`；人工待验 |
| CARD-002 | P0 | 从详情页或编辑页删除卡片 | 删除前确认、删除中禁用、失败处理、成功后返回首页 | 删除卡片；桌面数据可能包含关联记录 | `CardDetailPage.tsx`、`CardEditorPage.tsx`；人工待验 |
| CARD-003 | P1 | 新建或编辑题目、学科、我的答案、正确答案、补充说明、正确解法、第一处错误、错误原因和错误类型 | 新建、编辑、字段为空、长文本、表单错误 | 保存后创建新卡片或增加已有卡片 revision | `CardEditorPage.tsx`、`CardEditorFields.tsx`；领域测试覆盖 |
| CARD-004 | P0 | 在只有题目文本或只有图片时保存；完全空白时阻止保存 | 空白、仅图片、仅文本、错误类型非法 | 状态由内容自动计算为“待完善”或“已整理” | `domain/card.test.ts` 测试覆盖 |
| CARD-005 | P1 | 为卡片添加最多 3 个主要知识点，章节可为空；可以逐项删除 | Enter 添加、按钮添加、空名称、重复名称、达到上限 | 保存到卡片知识点数组；学科来自当前表单，空学科回退“未分类” | `CardEditorFields.tsx`、`domain/card.test.ts`；人工待验 |
| CARD-006 | P0 | 编辑内容每 700ms 自动保存为本地草稿，并在再次进入时恢复 | 新建草稿、同 revision 编辑草稿、损坏草稿、revision 已变化时丢弃旧草稿 | `localStorage[zhishi.editor-draft.<id|new>]`；正式保存后清除 | `CardEditorPage.tsx`；人工待验 |
| CARD-007 | P0 | 有未保存修改时，返回或关闭窗口会提示；确认离开后仍保留草稿 | 返回取消/确认、浏览器关闭或刷新、无修改直接离开 | 写入草稿，不自动提交卡片 | `CardEditorPage.tsx`；人工待验 |
| CARD-008 | P0 | 编辑已有卡片时以 `expectedRevision` 保存，检测并拒绝覆盖较新版本 | 正常保存、revision 冲突、错误提示、重新进入 | 成功增加 revision；冲突时不覆盖 | `cardService.test.ts`、`tauriCardService.test.ts` 测试覆盖 |

## 图片导入与编辑

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| IMAGE-001 | P1 | 在卡片编辑器点击选择或拖入 PNG、JPG、WebP 图片 | 非图片、非允许格式、超过 15MB、拖拽高亮、选择取消 | 合法图片先进入编辑弹窗，尚未写入卡片 | `CardEditorFields.test.tsx`、`useImageImport.ts` 测试/代码确认 |
| IMAGE-002 | P1 | 在图片编辑弹窗中左/右旋转、拖拽裁剪、重置、取消或确认 | 图片读取中/失败、裁剪各方向、旋转后重置裁剪、Escape、点遮罩关闭、处理中禁用 | 确认后导出编辑图；上限 1600 万像素，超大图等比缩小 | `imageEdit.test.ts` 测试覆盖；弹窗人工待验 |
| IMAGE-003 | P0 | 确认图片后导入资产；编辑器中可以删除图片 | 导入失败、删除失败、已保存资产与未保存资产 | 未保存资产删除时立即清理；保存后清理已从卡片移除的旧资产 | `CardEditorPage.tsx`、卡片服务；桌面待验 |
| IMAGE-004 | P1 | 查看已保存图片；读取失败时看到占位信息 | 即时 preview、持久化资产读取、读取失败、图片元素加载失败 | 桌面通过资产读取命令生成临时 Object URL，并在卸载时释放 | `AssetPreview.tsx`、`tauriCardService.test.ts`；桌面待验 |

## 编辑器中的 AI 整理

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| AIORG-001 | P1 | 在卡片编辑器中用题目文字或图片请求 AI 整理；未连接时尝试连接当前服务 | 无输入阻止、连接中、不可用、执行失败 | 请求包含当前输入与当前 revision；原始输入保留 | `CardEditorPage.tsx`、`aiService.test.ts` 代码/测试确认 |
| AIORG-002 | P1 | 查看 AI 整理进度，并防止把其他请求的进度串入当前面板 | preparing/运行阶段、完成、失败 | 进度事件按 requestId 过滤 | `aiService.test.ts` 测试覆盖 |
| AIORG-003 | P0 | 逐字段审阅 AI 建议；默认仅勾选原字段为空且 AI 确定的建议 | warnings、不确定提示、字段在生成期间被用户改动的冲突提示、零勾选禁用 | 审阅本身不写卡片 | `domain/ai.test.ts`、`AiReviewPanel.tsx` 测试/代码确认 |
| AIORG-004 | P0 | 拒绝全部或只接受所选建议；接受后仍需点击“保存卡片”才持久化 | 拒绝、部分接受、冲突字段、接受后的未保存状态 | 只更新当前表单；正式保存才写卡片 | `domain/ai.test.ts`、`CardEditorPage.tsx` 测试/代码确认 |

## 知识卡片与复习题

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| KNOW-001 | P1 | 每个具体知识点自动汇总为一张知识卡片，按来源数量和名称排序 | 无知识点、单个/多个来源、学科或章节范围筛选 | 内容由来源错题即时派生，不独立持久化 | `learningContent.test.ts` 测试覆盖 |
| KNOW-002 | P1 | 查看知识卡片的来源数、错误样本数、内容覆盖度、核心方法和易错提醒 | 初始卡片、持续积累、证据较充分、来源内容缺失 | 来源更新后派生内容随之更新 | `KnowledgeCardView.tsx`、`learningContent.ts` 代码确认 |
| KNOW-003 | P1 | 展开来源错题清单并进入来源详情 | details 开关、图片题占位、返回后的上下文 | 只导航 | `KnowledgeCardView.tsx`；人工待验 |
| KNOW-004 | P1 | 对具体知识点执行 AI 生成或重新生成 | 连接、进度、错误、warnings、来源 revision 变化 | 生成结果目前只保存在当前页面内存；来源数量或 revision 变化后旧结果失效 | `KnowledgeContextView.test.tsx`、`KnowledgeCardView.tsx` 测试/代码确认 |
| REVIEW-001 | P1 | 在复习题模块选择一个或多个知识点，再从范围内勾选作为生成依据的错题 | 无知识点、无来源错题、跨知识点多选、来源全选/取消 | 只建立生成范围，不立即生成 | [x] `ReviewView.tsx`、`reviewCards.test.ts`、[浏览器证据](evidence/REVIEW-001-builder.png) |
| REVIEW-002 | P1 | 选择生成总数并生成新练习题；每道所选错题至少对应 1 张 | 数量下限随来源数变化、生成中、失败、完成 | 生成数量不得小于来源错题数；新题需要保存 | [x] `reviewCards.test.ts`、`KnowledgeContextView.test.tsx` |
| REVIEW-003 | P1 | 将生成结果作为独立习题卡片查看，并保留知识点与来源错题关系 | 多卡片、答案展开、继续生成、来源追溯 | 所有成功生成的题目均持久化为习题卡片 | [x] 浏览器/Tauri 存储实现与测试、[保存证据](evidence/REVIEW-003-saved.png) |

## AI 服务连接

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| AICONN-001 | P1 | 查看 Codex、DeepSeek 和已保存的自定义 API，并识别当前使用/已配置/未配置 | 列表 loading、读取失败、选中态、动态自定义项 | 读取服务配置摘要，不回显密钥 | `AiConnectionsPage.test.tsx` 测试覆盖 |
| AICONN-002 | P0 | 通过浏览器完成知拾专用 Codex 登录、重新登录、设为当前或退出 | 等待授权、成功/失败、退出确认、按钮禁用 | 使用独立凭据边界；退出只清理知拾专用登录 | `AiConnectionsPage.test.tsx` 测试覆盖；桌面待验 |
| AICONN-003 | P0 | 配置 DeepSeek 或兼容 OpenAI Chat Completions 的自定义 API | 新增自定义项、名称、Base URL、模型、API Key 必填/留空保留、显示/隐藏 | API Key 保存到系统凭据库，页面不回显 | `AiConnectionsPage.test.tsx`、`aiService.test.ts` 测试覆盖；桌面待验 |
| AICONN-004 | P1 | 测试 API 连接、保存并设为当前、切换当前服务、删除配置 | 测试/保存/删除进行中，成功/失败提示，删除确认 | 保存使服务成为当前；删除配置和密钥 | `AiConnectionsPage.test.tsx` 测试部分覆盖；桌面待验 |

## AI Agent 工作区

> 当前应用实际挂载 `src/features/agent/AgentWorkspace.tsx`。`src/features/agent-demo/AgentWindow.tsx` 仍存在于仓库，但不是当前 `AppShell` 的入口，不能把它的提案式 UI 当作现状。

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| AGENT-001 | P1 | 通过右下角浮动按钮打开/收起 Agent；按 Escape 收起 | 打开、收起、Escape、对话框语义 | 不清空对话 | `AgentWorkspace.tsx`；人工待验 |
| AGENT-002 | P1 | 在“自动”和“仅聊天”模式切换 | 运行中禁用；仅聊天不读取或修改卡片 | 模式仅当前页面内存 | `AgentControls.test.tsx` 测试覆盖 |
| AGENT-003 | P1 | 选择低/中/高思考强度，并展开查看工具、权限和副作用标签 | 运行中禁用；工具读取失败时显示空清单 | 思考强度随下一轮请求发送 | `AgentControls.test.tsx` 测试覆盖 |
| AGENT-004 | P1 | 发送文字或图片；Enter 发送，Shift+Enter 换行；支持拖入图片 | 空消息禁用、忙碌禁用、拖拽态、读取错误 | 图片随请求导入；失败时清理本轮已导入资产 | `AgentComposer.test.tsx`、`useAgentHarness.ts` 测试/代码确认 |
| AGENT-005 | P1 | 一轮附加最多 3 张、单张最大 15MB 的图片，可预览和移除 | 达到上限、超限、非图片、读取失败 | 发送前只保留前端预览；发送时导入资产 | `AgentComposer.tsx` 代码确认；人工待验 |
| AGENT-006 | P1 | 输入 `@` 搜索并引用现有卡片，方向键选择、Enter 确认 | 最多显示 5 个候选；删除文本中的 @ 引用后不再随请求发送 | 请求传递所选卡片 ID | `AgentComposer.test.tsx` 测试覆盖 |
| AGENT-007 | P1 | 查看 Agent 的状态、决策摘要、工具开始/完成和最终消息；时间线自动滚动 | running、completed、waiting approval、cancelled、limit reached、错误 | 运行历史目前只在页面内存；最多向下一轮发送最近 12 条消息历史 | `agentReducer.test.ts`、`AgentTimeline.tsx` 测试/代码确认 |
| AGENT-008 | P0 | 只读工具自动执行；创建、修改、删除必须展示影响并等待批准 | pending、批准、拒绝、执行失败 | 批准后才发生写操作；拒绝不改数据 | `agentReducer.test.ts`、`AgentControls.test.tsx` 测试覆盖 |
| AGENT-009 | P0 | 批准或拒绝写操作，并在处理后刷新卡片列表 | 请求已处理、服务错误、批准结果反馈 | 创建/修改/删除卡片；刷新查询缓存 | `useAgentHarness.ts`、Agent 服务；桌面待验 |
| AGENT-010 | P1 | 运行中随时点击“停止本轮” | 取消进行中、取消后的运行状态、迟到事件 | 调用运行时 cancel；不应提交未批准写操作 | `useAgentHarness.ts`、`agentReducer.ts`；桌面待验 |
| AGENT-011 | P0 | 只能通过标题栏“新对话”重置；聊天文本要求新建对话会被拒绝 | 有活动 run 时先取消；所有待审批写操作自动拒绝；编辑器重置 | 清空内存时间线；不执行待审批写操作 | `useAgentHarness.ts` 代码确认 |
| AGENT-012 | P1 | 使用快捷建议发起常见任务 | 忙碌时禁用 | 与普通文字请求相同 | `AgentWorkspace.tsx`；人工待验 |
| AGENT-013 | P0 | 浏览器环境明确标注“本地模拟运行”；真实 AI 与工具只在桌面运行时执行 | 预览横幅、Provider 状态、浏览器模拟和桌面真实结果差异 | 浏览器卡片存储在 localStorage；桌面通过 Tauri 命令 | `browserAgentService.ts`、`agentService.ts` 代码确认 |

## 内容呈现与运行时数据

| ID | 级别 | 用户能力与当前入口 | 必须覆盖的状态和交互 | 数据或副作用 | 当前证据 |
|---|---|---|---|---|---|
| CONTENT-001 | P0 | 在题目、答案、解析和 AI 内容中查看 Markdown 与行内/块级 LaTeX | `\(...\)`、`\[...\]`、`$...$`、`$$...$$`、矩阵、长公式 | 原始 HTML 被跳过并清理，不能执行用户或 AI 注入的 HTML | `MathContent.test.tsx` 测试覆盖 |
| DATA-001 | P1 | 浏览器预览首次打开时获得示例卡片，后续刷新保留修改 | 首次、已有数据、损坏的本地数据 | `localStorage[zhishi.browser.cards.v1]`；损坏时恢复种子数据 | `browserCardService.ts` 代码确认 |
| DATA-002 | P0 | 桌面程序通过本地 Tauri 命令保存卡片和图片，浏览器与桌面数据不混用 | IPC 失败、资产读取失败、revision 冲突 | 桌面本地持久化；具体存储结构属于后端契约 | `tauriCardService.test.ts`、Rust storage 测试存在；桌面待验 |

## 已发现的审计缺口

以下内容不能仅凭静态代码认定已完整记录，需要下一轮人工走查：

1. 所有断点下的真实布局、滚动、遮挡、层级和焦点表现。
2. 从编辑器返回来源页后，用户对筛选/tab 上下文的实际感受。
3. 删除、保存、AI 失败时是否存在未捕获 Promise 导致的视觉反馈缺失。
4. Tauri 桌面运行时的 Codex 浏览器授权、系统凭据库、图片文件生命周期。
5. Agent 写操作批准、取消、步骤上限和运行时崩溃后的恢复表现。
6. 屏幕阅读器、完整 Tab 顺序、可见焦点、对比度以及 200% 缩放。
