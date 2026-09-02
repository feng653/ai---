# 知拾

本地优先的个人错题卡片桌面应用。

## 标准开发与构建

```powershell
pnpm install
pnpm tauri:dev
```

正式构建统一使用默认 Cargo 目标目录：

```powershell
pnpm tauri build --no-bundle
```

产物固定为：

- 开发构建：`src-tauri/target/debug/zhishi.exe`
- 正式构建：`src-tauri/target/release/zhishi.exe`

Windows 无法覆盖正在运行的 exe。重新构建前应先关闭知拾，不要通过新建 `CARGO_TARGET_DIR` 目录规避文件锁。只有 CI 隔离或专项验证才允许临时目标目录，验证后应删除。

## 质量门禁

```powershell
pnpm check
cd src-tauri
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```
