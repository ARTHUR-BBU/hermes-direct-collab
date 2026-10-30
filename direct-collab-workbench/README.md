# DIRECT 协作工作台

本工具是 Node 标准库实现的本机 CLI：登记任务、人工记录进度、审查和验证文件，并生成中文交接内容。它不启动 Agent、不执行审查或测试、不管理凭据，也不提供看板、后台服务、云同步或跨机器锁。

需要 Node.js 18 或更高版本（本机以 Node 22 测试）。在工具目录运行 `node --test`。任何工作目录均可通过 `--project` 指定项目绝对路径；省略时使用当前目录。命令输出 JSON，成功退出码 0，失败退出码 1。先备份重要项目。`init` 在项目中创建 `.collab`；若该目录已存在则拒绝，绝不覆盖。

## 操作示例

下面示例采用 PowerShell。把 `$tool` 换成本工具的 `cli.js` 绝对路径，`$project` 换成已有项目目录；项目已有 `src.js`、`review.txt`、`verify.txt` 三个普通文件。审查和验证文件应由实际执行相应工作的人事先写入，且不能包含密码或密钥。PowerShell 5.1 对原生命令参数的引号处理可能不同；使用 PowerShell 7 或从程序中以参数数组调用 CLI。

```powershell
$tool = (Resolve-Path './cli.js').Path
$project = (Resolve-Path './example-project').Path
node $tool init --project $project
# 对 Windows PowerShell 原生命令，JSON 中的双引号使用反斜杠转义
node $tool create --project $project --json '{\"id\":\"t1\",\"goal\":\"实现功能\",\"owner\":\"owner-example\",\"paths\":[\"src.js\"],\"interfaces\":[\"CLI\"],\"acceptance\":\"测试通过\",\"budgetMinutes\":30}'
node $tool start --project $project --json '{\"id\":\"t1\"}'
node $tool progress --project $project --json '{\"id\":\"t1\",\"evidence\":\"已完成修改\",\"next\":\"检查测试\"}'
node $tool submit --project $project --json '{\"id\":\"t1\"}'
node $tool review --project $project --json '{\"id\":\"t1\",\"reviewer\":\"reviewer-example\",\"result\":\"pass\",\"evidence\":\"review.txt\",\"coveredPaths\":[\"src.js\"]}'
node $tool accept --project $project --json '{\"id\":\"t1\",\"evidence\":\"verify.txt\"}'
node $tool status --project $project
node $tool handoff --project $project
```

`handoff` 返回 JSON 的 `markdown` 字段，可由调用方保存到自己选择的新文件；CLI 不覆盖项目交接文件。保存的文件只是带生成时间的快照，不会自动刷新：接手任务时应重新运行 `handoff` 或 `status` 查看当前状态，不能把旧快照当作实时交接台。交接内容标明新鲜度：历史验收状态仍保留，但文件或证据变化、丢失或无法读取时明确警告原验收不代表当前内容有效。`status` 包含完整状态、历史、`overdue` 和 `stale`。超时只是提醒检查，不代表进程死掉，也不代表工作有效；`stale` 表示相关文件丢失或其 SHA-256 不一致。

`progress` 的证据和 `next` 是当时的人工记录，不保证仍是当前行动：原文和历史保持不变。`status.tasks[]` 新增 `progressIsHistorical`（存在进度记录时为 true）及依据当前状态和新鲜度计算的 `currentNext`；`handoff` 对应显示历史进展、历史下一步和当前建议。建议仅供操作员核对，不代表执行了任何审查、验证或其他行动。受阻优先处理阻塞，恢复后重新依据恢复的状态生成建议；重提交清除旧审查并要求重新审查。已验收但失效的任务不能重新提交，须由人决定是否另建任务；工具不自动撤销历史验收或创建任务。旧版状态文件无需迁移；依赖旧交接文本标签的消费者需适配新标签。

## 命令与规则

- `create`：JSON 必填 `id`、`goal`、`owner`、`paths`（非空相对路径数组）、`interfaces`（非空字符串数组）、`acceptance`、正数 `budgetMinutes`。可登记现有文件、目录或尚不存在的路径；提交时必须存在。路径使用 `/`，不允许绝对路径、`..`、`.collab`、指向当前内部文件的硬链接或符号链接。
- `start`：`id`；检查其他 active、review 和由 active/review 进入 blocked 的任务的独占路径，包括目录后代、Windows 大小写别名和现存硬链接。`progress`：`id`、`evidence`（具体进度文字）、`next`。不要把秘密写进记录。
- `process`：在 active、blocked 或 review 阶段人工记录 `id`、正整数 `pid`、非空 `session`、`exitCode`（整数或未知时 `null`）；重复调用替换当前记录，历史保留快照。记录只是人为声明，不检查进程、不代表进展或会话可恢复，不要记录敏感信息。
- `block`：`id`、`reason`；active/review 阻塞后保留所有权，draft 阻塞不占用；`resume` 恢复之前状态并检查冲突。`cancel` 释放所有权：`id`、`reason`，取消不是验收通过。
- `submit`：`id`，计算文件 SHA-256 或目录树结构和文件哈希的摘要，进入 review；再次提交会清除旧审查。`review`：`id`、`reviewer`、`result`（`pass` 或 `fail`）、`evidence`（存在的项目内文件）及必填 `coveredPaths`（非空、无重复，逐项精确匹配提交路径）。审查人名字不能与负责人完全相同（精确字符串比较）；名字不同不证明审查独立。审查和验证证据放在所有提交路径及其目录之外，避免创建或修改证据后使待审快照失效。目录是完整路径单位，不可用子文件冒充目录；别名不替代原路径。审查记录保存证据及提交快照，部分范围可登记但不可验收；范围是人工声明，并不证明实际审查。
- `rework`：在 review 状态提供 `id`、非空 `reason`，回到 active，保留路径占用及历史快照，清除当前审查；修改后重新提交和审查。旧版待审提交须重新提交后登记新审查；旧 accepted 不变，范围显示 `legacy-unknown`，不虚构覆盖。只读查询不迁移或覆写旧账本；新操作会追加历史，账本版本仍为 1。
- `status.tasks[].coverage` 为 `none`、`partial`、`full` 或 `legacy-unknown`；`uncoveredPaths` 为未覆盖的路径数组，未知时为 null。`handoff` 同样显示审查范围及未覆盖内容。旧审查范围未知不代表完整审查。
- `accept`：`id`、`evidence`（与审查证据为不同文件，硬链接别名不算不同）。最新提交必须带有范围门禁标记，且必须有覆盖完整、通过的审查；旧待审提交必须重新提交及审查。待审文件及审查证据的当前哈希必须与记录一致；工具会计算验证文件哈希。验收后再次读取 `status` 可发现改动。
- `status` 和 `handoff` 不改变任务历史。每次任务操作的快照追加在 `.collab/state.json` 的 `history`；该文件同时是唯一状态入口。损坏或丢失时拒绝操作，不会用旧信息猜测。新范围门禁提交的历史验收若审查与验证证据路径规范化后相同，回放会明确拒绝；旧无门禁历史仍可读取。纯回放不访问文件系统，不能识别硬链接别名；实际 `accept` 会检查文件身份。Windows 路径比较忽略大小写及组件末尾的点和空格；侧栏平台未知时保守采用 Windows 比较，可能拒绝在大小写敏感系统上合法的仅大小写不同的证据记录。

## 安全和限制

项目操作员能控制参数和项目文件；CLI 通过路径检查、文件存在性及哈希检查降低误操作，使用本机排他锁和临时文件替换保护协作写入。每次修改在持久化之前重放校验；新门禁证据路径采用 CLI 和纯核心共用的词法规则，但纯回放不能检查文件或硬链接。旧版无门禁历史保留兼容，不能凭缺失门禁或其他账本字段证明其真实年代、新鲜度或记录者身份。锁不是跨主机分布式锁；异常中断可能留下 `.collab/lock`，须确认没有命令正在运行后人工检查并删除。用户能修改状态文件，也能伪造姓名、证据内容和文件；身份不同及证据文件不同并不能证明真正独立，SHA-256 只能检查内容一致，不能证明证据真实、测试实际运行或结论正确。本工具不是安全沙箱，无法阻止有同等文件权限的恶意进程竞争更换文件、修改状态或绕过锁；请只在可信的本机项目和账户使用。不要登记或记录密码、令牌、环境变量或原始敏感日志。文件哈希计算与操作不是对抗恶意并发进程的原子快照。

目录递归扫描可能对大目录开销很高；仅记录文件内容、目录结构和名称，不记录权限、时间戳等元数据。目录内符号链接或特殊文件会导致操作失败。路径冲突及硬链接检测依赖当前文件系统提供可靠的设备号和文件标识；文件被重命名、替换或并发更改时不能保证独占。内部文件硬链接检查仅针对检查时存在的 `.collab` 文件；原子替换后的旧状态文件硬链接不再指向当前状态。状态读取时检查每项历史快照的命令、状态转换、未授权字段变更及最终状态一致性；可检测部分缺失或不一致记录并拒绝操作，但无法检测仍构成合法历史的记录删除、整份状态回滚或协调伪造。状态记录未进行加密签名，没有外部可信锚点，因此不能防止或可靠检测蓄意伪造。其他操作系统和网络共享目录尚未验证。
