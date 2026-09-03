# 项目工作要求

- 所有代码更改必须经过测试才能提交或推送。
- 前端更改至少运行 `pnpm check`；Rust/Tauri 更改还必须运行 `cargo test --manifest-path src-tauri/Cargo.toml --locked` 和 `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`。

# 编译产物管理

- Windows 唯一正式可交付程序是 `src-tauri/target/release/zhishi.exe`。
- `src-tauri/target/debug/`、`src-tauri/target/*/build/` 和 `src-tauri/target/*/deps/` 中的 EXE 都是 Cargo 内部中间产物，不得当作正式程序交付。
- 禁止复制或改名生成 `zhishi-updated.exe`、`app.exe`、带日期后缀的 EXE，或在仓库内另建 `target-*`、`release-*` 编译目录。
- 禁止通过设置仓库内的备用 `CARGO_TARGET_DIR` 规避文件占用。若 `zhishi.exe` 正在运行，应先关闭对应进程再编译；不得保留两个候选 EXE。
- 正式编译统一运行 `pnpm tauri build --no-bundle`。需要安装包时必须明确提出，生成后只从 Tauri 标准 `bundle` 目录取用。
- 发现旧名称、手工副本或无法确认来源的产物时，先确认目标位于 `src-tauri/target/`，再使用 `cargo clean --manifest-path src-tauri/Cargo.toml` 清理并重新编译，禁止逐个手工挑选旧产物继续使用。
- 编译完成后必须验证 `src-tauri/target/release/zhishi.exe` 存在、更新时间属于本次编译，并检查 `release` 根目录不存在其他产品名称的 EXE。
- `target/`、`dist/`、安装包和 EXE 均为本地生成物，不得加入 Git；提交只包含源码、测试和文档。

# Demo 管理

- 所有独立 demo 统一放在 `docs/demo/<demo-name>/`，一个 demo 只能占用一个语义明确的独立目录，禁止把 demo 代码直接散放在 `docs/` 根目录。
- 每个 demo 使用 `index.html` 作为入口；该 demo 的 HTML、CSS、JavaScript、测试和专用资源必须放在同一目录内，不得与其他 demo 共用无归属的代码文件。
- `docs/demo/README.md` 维护 demo 索引。新增、重命名或删除 demo 时，必须同步更新索引及仓库内相关路径引用。
- demo 代码同样受文件规模和测试要求约束；提交或推送前至少运行与改动范围对应的测试，涉及前端仓库时统一运行 `pnpm check`。
