# 旧 UI → 新 UI 迁移矩阵

本表是新 UI 设计与实现的唯一迁移入口。每个功能 ID 必须保持独立，不得用“整个页面已完成”代替逐项确认。

## 状态规则

- 新 UI 入口写 `待定`：尚未完成信息架构设计。
- 行为决策默认 `保持`；如需改变，填写对应契约和已批准的决策记录。
- `已实现` 只表示代码存在；只有自动化与人工证据齐全后才能标记 `已验证`。

## 2026-09-03 实现统计

- [x] 54 / 54 个功能 ID 已逐项映射到新 UI，没有遗留 `待定` 入口。
- [x] 54 / 54 个功能 ID 已有生产代码实现；`REVIEW-001`～`REVIEW-003` 已从 Demo 补齐到浏览器与 Tauri 两套数据层。
- [x] 前端完整检查、Rust 测试和 Clippy 已通过；关键视觉与 375px 响应式证据已登记。
- [ ] 涉及真实 Provider、系统凭据库、桌面文件生命周期和 Agent 写工具的条目，仍保留桌面实机待验，不以浏览器模拟替代。

| 功能 ID | 当前入口/位置 | 新 UI 入口 | 行为决策 | 设计 | 实现 | 验证证据 |
|---|---|---|---|---|---|---|
| NAV-001 | 全局侧栏与顶栏 | 深绿主侧栏 + 纸张色顶栏 | 保持 | [x] 已映射 | [x] 已实现 | [x] [桌面首页](evidence/NAV-001-library-desktop.png)；[x] `AppShell.test.tsx` |
| NAV-002 | 侧栏收起按钮/品牌区 | 侧栏底部收起；品牌展开 | 保持 | [x] 已映射 | [x] 已实现 | [x] [收起态](evidence/NAV-002-sidebar-collapsed.png)；[x] `AppShell.test.tsx` |
| NAV-003 | 移动品牌按钮 | 移动顶栏左侧品牌 | 保持 | [x] 已映射 | [x] 已实现 | [x] [375px](evidence/NAV-003-mobile.png)；[ ] 屏幕阅读器专项 |
| NAV-004 | 顶栏面包屑 | 顶栏 eyebrow + 页面标题 | 保持 | [x] 已映射 | [x] 已实现 | [x] 首页/详情/编辑/设置截图 |
| LIB-001 | 首页错题网格 | 主内容三列纸卡网格 | 保持 | [x] 已映射 | [x] 已实现 | [x] [正常列表](evidence/NAV-001-library-desktop.png)；[x] `pnpm check` |
| LIB-002 | 错题卡片点击/Enter | 整张纸卡可点击、可聚焦 | 保持 | [x] 已映射 | [x] 已实现 | [x] 浏览器点击进入详情；[ ] 完整键盘走查 |
| LIB-003 | 错题卡片摘要 | 状态、学科、题目、错因、标签与彩色角饰 | 保持 | [x] 已映射 | [x] 已实现 | [x] [卡片摘要](evidence/NAV-001-library-desktop.png) |
| TREE-001 | 首页左侧知识树 | 主侧栏内“知识脉络” | 保持 | [x] 已映射 | [x] 已实现 | [x] `knowledgeTree.test.ts`；[x] 首页截图 |
| TREE-002 | 知识树节点和底部筛选 | 可展开层级 + 底部范围按钮 | 保持 | [x] 已映射 | [x] 已实现 | [x] `KnowledgeTreeFilter.test.tsx` |
| TREE-003 | 知识树搜索框 | 侧栏知识树顶部搜索 | 保持 | [x] 已映射 | [x] 已实现 | [x] `KnowledgeTreeFilter.test.tsx`、`knowledgeTree.test.ts` |
| LIB-004 | 首页内容 tabs | 搜索右侧分段 tabs | 保持 | [x] 已映射 | [x] 已实现 | [x] `KnowledgeContextView.test.tsx`；[x] 首页/知识/复习截图 |
| CARD-001 | `/cards/:id` | 全宽纸张式详情 | 保持 | [x] 已映射 | [x] 已实现 | [x] [详情](evidence/CARD-001-detail.png)；[x] `pnpm check` |
| CARD-002 | 详情/编辑工具栏删除 | 顶部危险操作 | 保持删除确认和失败保护 | [x] 已映射 | [x] 已实现 | [x] 失败反馈代码与测试检查；[ ] 桌面关联数据人工删除 |
| CARD-003 | `/cards/new`、`/cards/:id/edit` | 编号分区编辑器 + 右侧 AI 面板 | 保持 | [x] 已映射 | [x] 已实现 | [x] [编辑器](evidence/CARD-003-editor.png)；[x] `CardEditorFields.test.tsx` |
| CARD-004 | 编辑器保存校验 | 编辑器顶部“保存卡片” | 保持 C-01、C-02 | [x] 已映射 | [x] 已实现 | [x] `domain/card.test.ts` |
| CARD-005 | 编辑器知识点区 | 三列已有知识点选择器 + 新建知识点 | 保持 | [x] 已映射 | [x] 已实现 | [x] `CardEditorFields.test.tsx`；[ ] 完整键盘走查 |
| CARD-006 | 编辑器草稿恢复 | 标题栏草稿状态 + 自动暂存 | 保持 C-04 | [x] 已映射 | [x] 已实现 | [x] 草稿状态代码检查；[ ] 刷新恢复人工录屏 |
| CARD-007 | 编辑器返回/窗口关闭 | 返回按钮 + 离开确认 | 保持 C-04 | [x] 已映射 | [x] 已实现 | [x] 代码检查；[ ] 关闭窗口人工录屏 |
| CARD-008 | 编辑器保存 | 顶部主操作 + revision 冲突横幅 | 保持 C-03 | [x] 已映射 | [x] 已实现 | [x] `cardService.test.ts`、`tauriCardService.test.ts` |
| IMAGE-001 | 编辑器图片上传区 | 题目材料内虚线上传框 | 保持 C-07 | [x] 已映射 | [x] 已实现 | [x] `CardEditorFields.test.tsx`、`useImageImport` 测试 |
| IMAGE-002 | 图片编辑弹窗 | 编辑器上层裁剪弹窗 | 保持 C-07 | [x] 已映射 | [x] 已实现 | [x] `imageEdit.test.ts`；[ ] 手势与 Escape 人工录屏 |
| IMAGE-003 | 图片确认与删除按钮 | 裁剪弹窗/材料预览操作区 | 保持 | [x] 已映射 | [x] 已实现 | [x] 前端与服务测试；[ ] 桌面文件生命周期 |
| IMAGE-004 | 卡片详情/编辑器图片预览 | 详情材料块/编辑器预览 | 保持 | [x] 已映射 | [x] 已实现 | [x] `tauriCardService.test.ts`；[ ] 桌面 Object URL 生命周期 |
| AIORG-001 | 编辑器右侧 AI 整理 | 编辑器右侧独立纸卡面板 | 保持 C-05 | [x] 已映射 | [x] 已实现 | [x] [编辑器](evidence/CARD-003-editor.png)；[x] `aiService.test.ts`；[ ] 真实 Provider |
| AIORG-002 | AI 整理进度区 | 右侧 AI 面板内进度状态 | 保持 | [x] 已映射 | [x] 已实现 | [x] `aiService.test.ts`；[ ] 真实 Provider |
| AIORG-003 | AI 建议逐字段审阅 | 右侧逐字段建议卡 | 保持 C-05、C-06 | [x] 已映射 | [x] 已实现 | [x] `domain/ai.test.ts`、组件测试；[ ] 真实 Provider |
| AIORG-004 | 拒绝全部/接受所选/保存 | 建议面板操作 + 独立正式保存 | 保持 C-05 | [x] 已映射 | [x] 已实现 | [x] `domain/ai.test.ts`；[ ] 真实 Provider |
| KNOW-001 | 知识卡片 tab 列表 | 首页“知识卡片”纸卡网格 | 保持 C-08 | [x] 已映射 | [x] 已实现 | [x] [列表](evidence/KNOW-001-grid.png)；[x] `learningContent.test.ts` |
| KNOW-002 | 具体知识卡片详情 | tab 内单知识点详情 | 保持 C-08 | [x] 已映射 | [x] 已实现 | [x] [详情](evidence/KNOW-002-detail.png)；[x] `learningContent.test.ts` |
| KNOW-003 | 知识卡片来源列表 | 详情底部可展开来源 | 保持 C-08 | [x] 已映射 | [x] 已实现 | [x] 详情代码检查；[ ] 返回上下文人工录屏 |
| KNOW-004 | 知识卡片 AI 生成 | 详情标题区“AI 生成/重新生成” | 保持 C-09 | [x] 已映射 | [x] 已实现 | [x] `KnowledgeContextView.test.tsx`；[ ] 真实 Provider |
| REVIEW-001 | 知识点与来源错题范围 | “复习题”内 01/02 双层多选 | 按新版 C-10 重构 | [x] 已映射 | [x] 已实现 | [x] [生成器](evidence/REVIEW-001-builder.png)；[x] `reviewCards.test.ts` |
| REVIEW-002 | 生成数量与进度 | 03 数量控件 + 保存中状态 | 按新版 C-10 重构 | [x] 已映射 | [x] 已实现 | [x] `reviewCards.test.ts`、`KnowledgeContextView.test.tsx` |
| REVIEW-003 | 已保存习题卡片 | 保存结果纸卡 + 答案/来源 | 按新版 C-10 重构 | [x] 已映射 | [x] 已实现 | [x] [保存结果](evidence/REVIEW-003-saved.png)；[x] TS/Rust 持久化测试 |
| AICONN-001 | `/settings/ai` 服务商列表 | “AI 接入”双栏页面 | 保持 | [x] 已映射 | [x] 已实现 | [x] [设置页](evidence/AICONN-001-settings.png)；[x] `AiConnectionsPage.test.tsx` |
| AICONN-002 | Codex 连接面板 | 设置页 Codex 步骤式登录面板 | 保持 C-16 | [x] 已映射 | [x] 已实现 | [x] 前端/Rust 单元测试；[ ] Codex 桌面登录实机 |
| AICONN-003 | DeepSeek/自定义 API 表单 | 设置页 Provider 表单 | 保持 C-16 | [x] 已映射 | [x] 已实现 | [x] 前端/Rust 单元测试；[ ] 系统凭据库实机 |
| AICONN-004 | 测试/保存/切换/删除按钮 | Provider 面板底部操作区 | 保持 C-16 | [x] 已映射 | [x] 已实现 | [x] `AiConnectionsPage.test.tsx`；[ ] 真实 API 与删除实机 |
| AGENT-001 | 右下角浮动 Agent | 右下角浮动按钮 + 抽屉式对话窗 | 保持 | [x] 已映射 | [x] 已实现 | [x] [打开态](evidence/AGENT-001-open.png)；[x] Escape 代码检查 |
| AGENT-002 | Agent 自动/仅聊天切换 | 对话窗控制栏分段按钮 | 保持 | [x] 已映射 | [x] 已实现 | [x] `AgentControls.test.tsx` |
| AGENT-003 | 思考强度和工具清单 | 控制栏选择器 + 工具摘要 | 保持 C-11 | [x] 已映射 | [x] 已实现 | [x] `AgentControls.test.tsx`；[ ] 桌面工具清单 |
| AGENT-004 | Agent 输入区 | 对话窗底部 composer | 保持 | [x] 已映射 | [x] 已实现 | [x] `AgentComposer.test.tsx` |
| AGENT-005 | Agent 图片附件区 | composer 附件预览带 | 保持 | [x] 已映射 | [x] 已实现 | [x] 代码与上传单测；[ ] 桌面资产失败清理 |
| AGENT-006 | Agent `@` 卡片引用 | composer 内联候选浮层 | 保持 | [x] 已映射 | [x] 已实现 | [x] `AgentComposer.test.tsx` |
| AGENT-007 | Agent 运行时间线 | 对话窗主时间线 | 保持 C-13 | [x] 已映射 | [x] 已实现 | [x] `agentReducer.test.ts`；[x] 自动滚动崩溃已修复并走查 |
| AGENT-008 | Agent 写操作审批卡 | 时间线内审批卡 | 保持 C-11 | [x] 已映射 | [x] 已实现 | [x] `agentReducer.test.ts`、Rust Agent 测试；[ ] 桌面真实写入 |
| AGENT-009 | Agent 批准/拒绝结果 | 审批卡操作和结果消息 | 保持 C-11 | [x] 已映射 | [x] 已实现 | [x] reducer/Rust 测试；[ ] 桌面真实写入 |
| AGENT-010 | 停止本轮 | 运行中时间线下方停止按钮 | 保持 C-13 | [x] 已映射 | [x] 已实现 | [x] reducer 代码与测试；[ ] 桌面迟到事件实机 |
| AGENT-011 | 标题栏新对话 | Agent 标题栏新对话图标 | 保持 C-12 | [x] 已映射 | [x] 已实现 | [x] 代码与 reducer 测试；[ ] 活动 run 实机 |
| AGENT-012 | 快捷建议 | 时间线下方建议 chips | 保持 | [x] 已映射 | [x] 已实现 | [x] [Agent 打开态](evidence/AGENT-001-open.png) |
| AGENT-013 | 浏览器预览/桌面运行时标识 | 顶栏 badge + Agent 内提示 | 保持 C-14 | [x] 已映射 | [x] 已实现 | [x] 浏览器截图；[x] 服务边界测试；[ ] 桌面 badge 实机 |
| CONTENT-001 | 全应用数学内容区域 | 所有题目、答案、解析与 AI 内容 | 保持 C-15 | [x] 已映射 | [x] 已实现 | [x] `MathContent.test.tsx`；[x] 截图公式渲染 |
| DATA-001 | 浏览器预览数据层 | 不设导航；顶栏明确“本地模拟” | 保持 C-14 | [x] 已映射 | [x] 已实现 | [x] `cardService.test.ts`；[x] 浏览器保存习题卡走查 |
| DATA-002 | Tauri 桌面数据层 | 不改变入口；统一 IPC 服务 | 保持 C-03、C-14 | [x] 已映射 | [x] 已实现 | [x] `tauriCardService.test.ts`；[x] Rust storage 38 项；[ ] 桌面 UI 实机 |

## 明确废弃或行为变更

当前为空；54 项均未废弃。以后如有决定，只在这里追加，不删除上表原记录。

| 功能/契约 | 决定 | 原因 | 影响 | 批准人/日期 | 替代方案 |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
