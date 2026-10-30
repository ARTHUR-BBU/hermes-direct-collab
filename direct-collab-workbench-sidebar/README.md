# DIRECT collaboration sidebar

This source is a Hermes Desktop host plugin, not a standalone Node application. Runtime imports `@hermes/plugin-sdk`, `react`, and `react/jsx-runtime` must be supplied by a compatible host; the tests mock those imports and do not establish compatibility with a particular host version. The sidebar reads a user-authorized project ledger and does not run reviews or tests.

## Installation / 安装

The [Desktop SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk) specifies the app-level root `$HERMES_HOME/desktop-plugins` (normally `~/.hermes/desktop-plugins`), shared across profiles, not the Python plugins directory. Confirm the root used by your running Desktop first. The folder name must match the plugin ID. From the repository root in Git Bash or a POSIX shell, set `DESKTOP_ROOT` to that root in the shell's own path syntax; this refuses to overwrite an existing installation:

下面从仓库根目录执行；先确认运行中的 Desktop 实际使用的应用级插件根目录（跨 profile 共享），将 `DESKTOP_ROOT` 替换为当前 shell 的路径。命令拒绝覆盖同名安装：

```sh
DESKTOP_ROOT='/absolute/path/to/desktop-plugins'
test -d "$DESKTOP_ROOT" && test ! -e "$DESKTOP_ROOT/direct-collab-workbench-sidebar" && \
  mkdir "$DESKTOP_ROOT/direct-collab-workbench-sidebar" && \
  cp direct-collab-workbench-sidebar/plugin.js "$DESKTOP_ROOT/direct-collab-workbench-sidebar/plugin.js"
```

The destination must be `<root>/direct-collab-workbench-sidebar/plugin.js`. If the root is absent, confirm the Desktop home before creating it. Desktop watches the folder; if needed use the command palette's **Reload desktop plugins** and check Settings → Plugins for enablement or a load-error toast. Verify the pane actually appears; source files or tests alone do not establish a successful host load. Select and authorize the project folder in the pane. Disconnect does not revoke its persistent grant; revoke via Capabilities → Plugins → Folder access. This checkout has not been verified as loaded in a real host.

目标应为 `<root>/direct-collab-workbench-sidebar/plugin.js`。若根目录不存在，先确认 Desktop home，再创建目录。Desktop 监听目录；必要时在命令面板执行 **Reload desktop plugins**，并在 Settings → Plugins 检查启用状态或加载失败提示。须确认面板实际出现；源码或测试不证明宿主加载成功。在面板选择并授权项目目录；断开不会撤销持久授权，需在 Capabilities → Plugins → Folder access 撤销。本仓库副本尚未验证真实宿主加载。

Keep this directory next to `../direct-collab-workbench`. Node.js 18 or newer is required for development tests. From this directory run:

```sh
node --test *.test.mjs test.mjs
```

On shells without glob expansion, list the test files explicitly. Regenerate the embedded shared ledger core after changing the sibling `ledger-core.js`:

```sh
node build-core.cjs
```

`build-parity.test.mjs` checks that regeneration reproduces the committed plugin and that the shared core and sidebar agree. Fixture provenance is documented in `../direct-collab-workbench/fixtures/README.md`.
