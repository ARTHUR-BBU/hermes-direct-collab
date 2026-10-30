# Hermes Direct Collab

[English](README.md)

本项目提供由操作员驱动的本机开发任务协作账本、Hermes Desktop 只读侧栏和协作技能。它不是 Agent 调度器：启动和监督已授权的 Agent、安排独立审查、运行测试以及决定验收，均由操作员负责。CLI 记录声明并检查一致性，不代替执行上述工作。

## 组成

- `direct-collab-workbench/`：基于 Node 标准库的 CLI、账本核心和测试。状态及历史保存在项目的 `.collab/state.json`。
- `direct-collab-workbench-sidebar/`：展示账本、任务状态和声明的五关状态的 Hermes Desktop 插件；只读，不控制 CLI 或 Agent。
- 随附的 `direct-multi-agent-collab` 技能描述操作流程；技能是指导，不是自动派工器或安全控制。使用前阅读 `SKILL.md`，并按本机安装位置配置工作台入口路径。

## 依赖与安装

目标运行时为 Node.js **18 或更高版本**；参考工作台仅在本机 Windows、Node 22 上测试。这些测试不能证明其他操作系统、网络文件系统或 Node 版本受支持。侧栏需要 Hermes Desktop 和插件 SDK；**尚未验证**兼容的 SDK/Desktop 版本范围。CLI 不依赖侧栏。

克隆或下载本仓库并保持目录结构，在仓库根目录先验证 CLI，不会创建项目状态：

```sh
node --version
node direct-collab-workbench/cli.js help
```

选择已有的可信项目目录，先备份。自行确定本机项目和仓库的绝对路径。例如在支持 POSIX 的 shell 中，从仓库根目录运行，替换为自己的已有项目路径：

```sh
PROJECT='/absolute/path/to/your/existing-project'
node direct-collab-workbench/cli.js init --project "$PROJECT"
node direct-collab-workbench/cli.js status --project "$PROJECT"
node direct-collab-workbench/cli.js handoff --project "$PROJECT"
```

`init` 创建 `.collab`，目录已存在时拒绝；不要通过重新初始化或删除已有记录来恢复错误。中断后先检查状态。Windows Git Bash 调用原生 Node 时请转换已有项目路径，例如 `PROJECT="$(cygpath -m '/f/path/to/existing-project')"`，替换为自己的路径。不同 shell 的 JSON 与原生命令引号处理不同，程序调用时优先使用参数数组。输出为 JSON；同时检查退出码和响应。命令字段和状态规则见[中文命令参考](direct-collab-workbench/README.md)。

**侧栏需要手动安装。** 按[侧栏安装说明](direct-collab-workbench-sidebar/README.md)定位应用级插件目录，在不覆盖已有安装的前提下复制并重载、启用。本项目不保证宿主加载成功。加载后在侧栏选择并授权实际项目文件夹；会话目录不等于授权。点击刷新重新读取。断开只清空视图，**不会撤销持久文件夹授权**；需在 Desktop 的 Capabilities → Plugins → Folder access 中撤销。外部撤销在下一次读取时才会发现。侧栏将 `.collab/state.json` 全部读入内存，拒绝超过 **4 MiB** 的文件；它不是实时视图，也不核验文件新鲜度或证据。

**手动安装技能。** 从 Hermes 配置确认当前 profile 的实际技能目录；不要假设是默认 profile，也不要覆盖同名技能。在仓库根目录把 `SKILLS_DIR` 替换为该目录的绝对路径。Linux/macOS POSIX shell：

```sh
SKILLS_DIR='/absolute/path/to/active-profile/skills'
test -d "$SKILLS_DIR" && test ! -e "$SKILLS_DIR/direct-multi-agent-collab" && \
  cp -R skills/direct-multi-agent-collab "$SKILLS_DIR/"
export DIRECT_COLLAB_CLI="$PWD/direct-collab-workbench/cli.js"
node "$DIRECT_COLLAB_CLI" help
hermes skills list
```

Windows Git Bash 使用原生 Windows Node 时，`SKILLS_DIR` 使用 Git Bash 路径（替换示例），导出 CLI 前转换路径：

```sh
SKILLS_DIR='/f/path/to/active-profile/skills'
test -d "$SKILLS_DIR" && test ! -e "$SKILLS_DIR/direct-multi-agent-collab" && \
  cp -R skills/direct-multi-agent-collab "$SKILLS_DIR/"
export DIRECT_COLLAB_CLI="$(cygpath -m "$PWD/direct-collab-workbench/cli.js")"
node "$DIRECT_COLLAB_CLI" help
hermes skills list
```

不要将 Git Bash 的 `/f/...` 格式 `$PWD` 直接用作原生 Node 的脚本路径。从继承 `DIRECT_COLLAB_CLI` 的环境启动 Hermes，或明确向 Agent 提供 CLI 的绝对路径；在另一个 shell 设置变量不会改变已运行的 Desktop 进程。检查技能列表，启动新会话（或按支持的方式重载技能）并显式加载。该流程未在所有 Hermes 版本及 Desktop 环境验证；技能本身不证明新会话能识别正确项目或实际派工。

## 工作流与可信边界

1. 登记负责人、项目相对路径、接口、验收和预算；实际派工前启动任务。路径冲突检查只协调本机合作方，不是访问控制边界。
2. 如实登记进度和进程信息；这些是声明，不是存活检查。按需阻塞、恢复或取消。预算提醒不证明进程已停止。
3. 送审生成快照，安排真实独立审查，登记审查人、结论、证据和精确覆盖路径。可登记部分覆盖，但不能满足当前验收门禁。即使声明完整覆盖、姓名不同且哈希匹配，仍**不能证明**实际发生了独立或完整审查。
4. 实际执行验证，以不同文件登记验证证据；仅在门禁和当前哈希匹配后由人决定验收。修改后返修并重新送审；旧待审提交须重新送审和审查。再次检查 `status` 和 `handoff`：后续文件或证据失效时，历史验收仍保留。交接输出是快照，不会实时更新。

账本未签名且没有外部可信锚点。回放可发现部分不一致，不能发现所有协同伪造、回滚或删除。哈希仅检查内容一致性，不证明真实性、作者身份或测试实际执行。本机锁不是分布式锁；有同等文件权限的恶意进程可以绕过检查或并发竞争。**本工具不是沙箱**，不能作为对抗恶意行为者的审计系统。详见 [SECURITY.md](SECURITY.md)。

不要把密码、令牌、环境变量值或敏感日志写入任务 ID、自由文本、证据或状态。侧栏只尽力遮盖部分常见模式，不能保证脱敏；完整账本会进入内存，可能包含隐私。分享交接、截图、问题报告及日志前须人工检查。大目录快照可能耗时；扫描路径中的符号链接和特殊文件会被拒绝。异常中断遗留的锁需在确认没有命令运行后人工检查。

## 测试、证据和升级

在仓库根目录运行现有 Node 测试：

```sh
node --test direct-collab-workbench/*.test.js
node --test direct-collab-workbench-sidebar/*.test.mjs
```

不同 shell 的通配符展开规则不同；请在支持展开的 shell 中运行，或逐个指定测试文件。本机隔离验证仅覆盖实际执行的命令和环境；自动测试不能证明 Desktop SDK 兼容、侧栏真实加载、其他平台或真实多 Agent 审查。

升级前备份 `.collab`、审阅变更，并在隔离副本中运行测试。旧验收作为历史保留；旧待审提交须按当前门禁重新送审，旧版未知覆盖不会自动变成完整覆盖。依赖升级前，请自行验证 Desktop 加载、权限、真实 Agent 工作流和恢复流程。

## 许可证

MIT；见 [LICENSE](LICENSE) 和 [第三方声明](THIRD_PARTY.md)。
