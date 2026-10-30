# Hermes Direct Collab

[English](README.md)

**让多 Agent 协作有交代，而不只是有回复。**

当几个 Agent 同时参与开发，难点往往不是把任务分出去，而是接下来：谁负责哪些文件？交付的是哪个版本？审查覆盖了什么？返修后，原来的通过结论还算不算数？会话一长，这些答案很容易散落在聊天记录里。

Hermes Direct Collab 是一套**由操作员掌舵的本地协作工作台**：用 CLI 记录任务与交付过程，用 Hermes Desktop 只读侧栏查看进展，再用随附技能指导协作。它为协作留下一条可回看的线索，让接手的人知道现在该查什么，而不是凭一句“已经完成”往前走。

它适合在可信本地项目中，主动组织多个获授权 Agent 分工的开发者或协调者；也适合需要把审查、返修和交接说清楚的小团队。如果你想要系统自动挑选、启动并监督 Agent，这不是它的定位。

### 五关：把交付过程摆在眼前

侧栏根据账本展示五个阶段：**立项 → 派工 → 施工 → 审片 → 交片**。名字借用了制作流程，实际可用于普通开发任务：从登记目标和负责人，到记录启动、进展、送审与验收。路径冲突检查、提交快照和审查覆盖登记，帮助操作员发现协作中的遗漏；状态和交接则帮助下一位接手者找到当前线索。

这些是**账本中登记的状态，不是对现实的自动核验**。侧栏只读，也不是实时监控；它不会证实 Agent 在工作、审查确实独立或测试确实运行。需要时重新读取状态，并亲自核对产物和证据。

### 核心特征：能帮你解决什么

- **本地记录，接手有线索：** 任务、进度、提交和结论保存在项目的 `.collab/state.json`，不必只靠翻聊天记录寻找上下文。
- **文件范围冲突检查：** 登记任务涉及的路径，帮助发现合作任务之间的范围重叠；它是协调提示，不会限制 Agent 访问文件。
- **审查范围门禁：** 登记审查覆盖的确切路径；允许记录部分覆盖，但不能凭部分覆盖满足当前验收门禁。
- **同一任务返修与交接：** 在原任务中保留返修线索，修改后重新提交快照并审查；交接输出是当时的快照，方便接手者继续核对。
- **侧栏五关：** Hermes Desktop 侧栏集中展示账本中声明的阶段和任务状态；它只读、需手动刷新，也可不安装侧栏而单独使用 CLI。
- **随附协作技能：** 为协调 Agent 提供登记、派工、审查和交接的流程指导；它不会自动启动或监督 Agent。

### 与自动调度有什么不同？

自动调度通常着重由系统决定何时把任务交给哪个执行者；这里则由人或协调者**直接选择并启动获授权的 Agent**，安排独立审查、运行验证并决定是否验收。工作台负责记录声明、检查路径与门禁的一致性，不会替你派工、运行测试或做判断。技能是流程指导，不是自动派工器或安全控制。

### 一个任务如何走完？

下面是**虚构的示意对话**，展示人的操作与账本记录如何配合，并非真实运行记录，也不是可直接复制的 CLI 命令。

> **协调者：** 请写手 A 实现设置页的输入校验，只负责约定的文件；验收要覆盖空值和非法输入。我先登记目标、路径、接口和预算，启动任务后再派工。
>
> **写手 A：** 修改已完成，我已停止修改并说明进度。
>
> **协调者：** 登记进度并送审，固定这次提交的快照。请审查者 B 独立检查约定范围。
>
> **审查者 B：** 发现非法输入处理遗漏，审查不通过；已把发现写入审查证据。
>
> **协调者：** 记录审查结论和覆盖路径，退回返修。A 修复后重新送审，再请 B 审查新快照；旧结论不能替代新审查。
>
> **审查者 B：** 已审查新提交，登记的全部路径均已覆盖，结论通过。
>
> **协调者：** 我实际运行约定的验证，将结果写入与审查不同的证据文件；核对门禁和当前快照后决定验收，再读取状态与交接。

这个过程的价值是**让每次交接有上下文、每次返修有来路**。但证据和覆盖范围仍由人登记：账本能检查部分一致性，不能证明对话、审查或测试真实发生，也不能代替人的判断。验收后文件或证据变化时，历史验收仍会保留，应重新检查新鲜度。

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
