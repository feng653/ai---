# 2026-09-03 新 UI 验收记录

## 验收范围

- 运行时：Vite 浏览器预览，`http://127.0.0.1:4173/`
- 视口：桌面 `1440 × 1050`；移动 `375 × 812`
- 视觉依据：`docs/demo/knowledge-workspace-redesign/`
- 数据边界：浏览器预览使用本地模拟数据；没有把 Codex、DeepSeek、系统凭据库或 Tauri 文件读写记作浏览器实机通过。

## 自动化结果

- [x] `pnpm.cmd check`：25 个测试文件、98 项测试通过；类型检查和 Vite 构建通过；182 个代码文件均不超过 250 行，HTML 均不超过 300 行。
- [x] `cargo test --manifest-path src-tauri/Cargo.toml --locked`：38 项通过，0 失败，2 项真实模型调用测试按设计忽略。
- [x] `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`：通过。
- [x] 复习题聚焦测试：6 个测试文件、19 项测试通过。

## 浏览器人工走查

- [x] 桌面首页、三列错题卡片、知识树、搜索与三组内容 tab 正常显示。
- [x] 侧栏可收起，点击收起态品牌可展开；状态写入本地存储。
- [x] 错题卡片可进入详情；详情、编辑器、AI 接入和 Agent 均保留独立页面语境。
- [x] 知识卡片可从列表进入详情，显示核心方法、易错提醒和来源入口。
- [x] 复习题可选择知识点和来源错题，数量下限随来源数变化；生成后保存为独立习题卡片。
- [x] 保存结果显示知识点、来源数和答案开关；浏览器服务实际写入卡片存储。
- [x] Agent 可打开，展示浏览器模拟标识、模式、思考强度、工具清单、快捷建议和输入区。
- [x] `375px` 视口下卡片改单列，实测页面 `scrollWidth = 375`，无横向溢出。
- [ ] Tauri 桌面下真实 Codex 登录、DeepSeek/自定义 API、系统凭据库、图片文件生命周期和 Agent 写操作审批仍需有凭据的实机验收。
- [ ] 完整屏幕阅读器流程、200% 缩放和所有异常分支仍需专项人工验收。

## 截图索引

- [桌面首页](NAV-001-library-desktop.png)
- [侧栏收起](NAV-002-sidebar-collapsed.png)
- [移动布局](NAV-003-mobile.png)
- [错题详情](CARD-001-detail.png)
- [卡片编辑器](CARD-003-editor.png)
- [知识卡片列表](KNOW-001-grid.png)
- [知识卡片详情](KNOW-002-detail.png)
- [复习题生成器](REVIEW-001-builder.png)
- [已保存习题卡片](REVIEW-003-saved.png)
- [AI 接入](AICONN-001-settings.png)
- [Agent 打开态](AGENT-001-open.png)
