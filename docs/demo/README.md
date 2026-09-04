# Demo 索引

- `agent-harness/index.html`：通用 AI Agent Harness 演示，支持纯聊天、多步工具调用、思考状态、写操作审批、拒绝、取消和运行记录。
- `ai-agent-workflows/index.html`：AI 生成练习卡完整交互原型，覆盖独立知识卡列表/详情/编辑、主内容区来源选择与逐卡审核、错题字段比较、练习翻面与掌握状态、批量永久删除、外部平面设置窗、Agent 结构修复循环，以及收起按钮的实时工作状态；同目录 `contract-freeze.md` 是进入生产实现前的权威产品与数据合约。
- `error-card-library/index.html`：错题卡片新增、整理、筛选和详情交互演示。
- `knowledge-tree/index.html`：知识树、知识卡片和可配置数量复习题演示。
- `tree-sidebar-layout/index.html`：统一视觉风格的学习空间草图，包含柔和知识树、知识卡片、练习题和仅展示 AI 供应商的设置页。
- `knowledge-workspace-redesign/index.html`：基于 UI 重设计清单的完整工作台 Demo，含折页项目图标、知识树与卡片详情变形、编辑/裁剪/AI 审阅、供应商及自定义 API 设置和 Agent 小窗全流程动画；同目录 `功能还原对照表.md` 记录逐项映射。

每个 demo 的 HTML、CSS、JavaScript、测试和专用资源只放在自己的目录中。新增 demo 时，请新建语义明确的独立目录，并使用 `index.html` 作为入口。
