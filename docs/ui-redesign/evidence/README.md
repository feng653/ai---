# UI 基线证据

本目录用于保存旧 UI 和新 UI 的人工验收证据。第一版功能清单来自静态代码与测试审计；新 UI 的第一轮浏览器截图与验收记录已于 2026-09-03 补充。

## 当前记录

- [x] [2026-09-03 新 UI 验收记录](2026-09-03-new-ui-walkthrough.md)
- [x] 桌面与移动关键视觉截图
- [x] 前端与 Rust 自动化结果
- [ ] Tauri 桌面真实 Provider、凭据库、文件生命周期和 Agent 写审批实机录屏

## 命名规则

文件名以功能 ID 开头：

```text
NAV-002-sidebar-expanded.png
NAV-002-sidebar-collapsed.png
CARD-006-draft-restored.mp4
AGENT-008-write-approval.png
```

同一功能有多个状态时，在 ID 后增加状态名称，例如 `loading`、`empty`、`error`、`conflict`、`success`。

## 最低证据要求

- P0：完整流程录屏、关键状态截图、对应自动化测试或人工验收记录。
- P1：关键状态截图、验收步骤和结果。
- P2：至少保留验收步骤；如视觉变化明显，再补截图。

## 证据登记

采集证据后，在 `../feature-inventory.md` 的“证据”列和 `../migration-matrix.md` 的“验证证据”列填写相对路径。失败或缺失状态也要保留，不能只记录成功画面。
