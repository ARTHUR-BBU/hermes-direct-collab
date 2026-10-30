# Hermes Direct Collab

[中文](README.zh-CN.md)

**Give multi-agent work a trail, not just a final reply.**

When several agents contribute to a development task, the hard part often comes after delegation: who owns which files, what version was reviewed, and does that review still count after a fix? Those answers can easily get lost across conversations.

Hermes Direct Collab is a local workbench for an operator or coordinating agent. It keeps each assignment and its delivery history together in a ledger: the CLI records the work, an optional read-only Hermes Desktop sidebar shows its declared state, and an included skill guides the coordination workflow. The result is a clearer starting point for review, rework, and handoff—not a substitute for checking the work.

It is intended for trusted local projects where you actively organize authorized agents. It is not an agent scheduler: the operator or coordinator must choose and launch agents, supervise them, arrange independent review, run verification, and decide whether to accept the result.

### One assignment, five stages

A coordinating agent can track an assignment from its initial brief through **setup → delegation → work → review → delivery**. The sidebar presents these five stages from the ledger; they are declared states, not live observation. The CLI works independently of the sidebar, which must be installed separately and refreshed to read again.

- **Local history:** keep task details, progress, submissions and decisions in the project's `.collab/state.json`, so the next person has context.
- **File-scope checks:** detect declared path conflicts between cooperating tasks before overlapping work becomes a surprise. These checks do not restrict filesystem access.
- **Review coverage gate:** record the exact paths reviewed; partial coverage may be recorded but cannot satisfy the current acceptance gate.
- **Rework and handoff:** keep rework on the same task, submit a new snapshot and review after changes, and read a handoff snapshot for the current trail.
- **Five-stage sidebar:** see the declared task and gate states in Hermes Desktop without giving the sidebar control over agents or the CLI.
- **Coordination skill:** use the included skill as workflow guidance, not as an automatic dispatcher or security control.

**Language note:** The core interface and output, including the sidebar, are primarily in Chinese. This English README and the English command reference do not mean the product is fully localized.

### What rework looks like

The following is a **fictional illustration**, not a real execution record or copyable CLI commands:

> **Coordinator:** Agent A, implement input validation for the settings page within the agreed files; cover empty and invalid input. I'll register the scope, interfaces, acceptance criteria and budget, then start the task before delegating.
>
> **Agent A:** The changes are ready and I've stopped editing.
>
> **Coordinator:** I'll record progress and submit a snapshot. Reviewer B, please independently review the agreed scope.
>
> **Reviewer B:** Invalid input handling is incomplete; the review fails. I've documented the finding in review evidence.
>
> **Coordinator:** I'll record the result and covered paths, then return the same task for rework. After A fixes it, we'll submit a new snapshot for review; the old result cannot stand in for a new review.
>
> **Reviewer B:** I've reviewed the new submission and covered all declared paths; it passes.
>
> **Coordinator:** I'll run the agreed verification, record it in a separate evidence file, check the gate and current snapshot, and then decide whether to accept. I'll read status and handoff again.

The ledger checks some consistency, but it cannot prove an agent worked, a review was independent or complete, or a test actually ran. People must inspect the work and evidence. Historical acceptance remains even if files or evidence later become stale; check freshness again.

## Components

- `direct-collab-workbench/`: Node standard-library CLI, ledger core, and tests. Project state and history live in the project's `.collab/state.json`.
- `direct-collab-workbench-sidebar/`: Hermes Desktop plugin displaying the ledger, task status and declared five-stage gates. It reads only; it does not control the CLI or agents.
- The included `direct-multi-agent-collab` skill describes an operator workflow; a skill is guidance, not an automatic dispatcher or security control. Read its `SKILL.md` and configure the workbench entry path for your installation before using it.

## Requirements and installation

Node.js **18 or newer is the target**; the reference workbench was tested locally on Windows with Node 22. Other operating systems, network filesystems and Node versions have not been established as supported by those tests. Hermes Desktop and its plugin SDK are required for the sidebar; a compatible SDK/Desktop version range has **not been verified**. The CLI can be used without the sidebar.

Clone or download this repository and keep its files together. From its root, verify the CLI without creating project state:

```sh
node --version
node direct-collab-workbench/cli.js help
```

Choose an existing, trusted project directory and back it up first. Determine the absolute paths to that directory and this checkout on your own machine. For example, from the repository root in a POSIX-compatible shell, substitute your own existing project path:

```sh
PROJECT='/absolute/path/to/your/existing-project'
node direct-collab-workbench/cli.js init --project "$PROJECT"
node direct-collab-workbench/cli.js status --project "$PROJECT"
node direct-collab-workbench/cli.js handoff --project "$PROJECT"
```

`init` creates `.collab` and refuses an existing directory; never reinitialize or delete existing records to recover from an error. If interrupted, inspect the state first. In Windows Git Bash, convert the existing project's path for native Node, for example `PROJECT="$(cygpath -m '/f/path/to/existing-project')"`; substitute your own path. JSON and native-command quoting differ across shells; prefer passing an argument array from a program. Output is JSON; check both exit code and the response. See the [English command reference](direct-collab-workbench/README.en.md) for commands, fields and state rules.

**Sidebar installation is manual.** Follow the [sidebar installation instructions](direct-collab-workbench-sidebar/README.md) to locate the app-level Desktop plugin root, copy the plugin without overwriting an existing installation, and reload/enable it. No successful host load is implied. After loading it, select and authorize the actual project folder in the sidebar; the current session directory is not authorization. Use Refresh to read again. Disconnect clears the view **but does not revoke persistent folder access**; revoke it in Desktop under Capabilities → Plugins → Folder access. External revocation is detected on the next read. The sidebar reads `.collab/state.json` into memory, rejects files over **4 MiB**, and is not live; it cannot verify filesystem freshness or evidence.

**Skill installation (manual).** Identify the active profile's actual skills directory from your Hermes configuration; do not assume the default profile or overwrite an existing skill. From this checkout, set `SKILLS_DIR` to that directory's absolute path. For Linux/macOS POSIX shells:

```sh
SKILLS_DIR='/absolute/path/to/active-profile/skills'
test -d "$SKILLS_DIR" && test ! -e "$SKILLS_DIR/direct-multi-agent-collab" && \
  cp -R skills/direct-multi-agent-collab "$SKILLS_DIR/"
export DIRECT_COLLAB_CLI="$PWD/direct-collab-workbench/cli.js"
node "$DIRECT_COLLAB_CLI" help
hermes skills list
```

For Windows Git Bash with native Windows Node, use a Git Bash path for `SKILLS_DIR` (replace the example); convert the CLI path before exporting it:

```sh
SKILLS_DIR='/f/path/to/active-profile/skills'
test -d "$SKILLS_DIR" && test ! -e "$SKILLS_DIR/direct-multi-agent-collab" && \
  cp -R skills/direct-multi-agent-collab "$SKILLS_DIR/"
export DIRECT_COLLAB_CLI="$(cygpath -m "$PWD/direct-collab-workbench/cli.js")"
node "$DIRECT_COLLAB_CLI" help
hermes skills list
```

Do not use Git Bash's `/f/...` `$PWD` directly as a native Node script path. Start Hermes from an environment inheriting `DIRECT_COLLAB_CLI`, or give the agent the CLI's absolute path explicitly; setting it in a separate shell does not alter an already running Desktop process. Check the list, start a new session (or reload skills as supported), and explicitly load the skill. This procedure has not been verified against all Hermes versions or Desktop environments. It does not prove that a new session identifies the correct project or can dispatch agents.

## Workflow and trust boundaries

1. Register a task with an owner, relative paths, interfaces, acceptance and budget; start it before delegating. Path conflict checks are advisory coordination among cooperating local users, not an access-control boundary.
2. Record actual progress and process information; these are statements, not liveness checks. Block, resume or cancel as appropriate. A budget warning is not proof that a process stopped.
3. Submit snapshots, arrange real independent review and record the reviewer, result, evidence and exact covered paths. Partial coverage may be recorded but cannot satisfy the current acceptance gate. A full coverage declaration, different names and matching hashes still do **not** prove an independent or complete review took place.
4. Perform actual verification, record a separate evidence file, then accept only when the gate and current hashes match. Rework and resubmit after changes; old pending submissions need a fresh submission and review. Check `status` and `handoff` again: historical acceptance is retained even if files or evidence later become stale. Handoff output is a snapshot, not a live document.

The ledger is unsigned and has no external trusted anchor. Replay catches some inconsistent histories, not a coordinated forgery, rollback or all deletions. Hashes check content consistency, not truth, authorship or actual test execution. Local locking is not distributed; hostile processes with equivalent filesystem permissions can bypass or race checks. This is **not a sandbox**. Do not use it as an audit system against malicious actors. See [SECURITY.md](SECURITY.md).

Do not put passwords, tokens, environment values or sensitive logs in task IDs, free text, evidence or state. The sidebar makes a best effort to mask some common patterns, but cannot guarantee redaction; the whole ledger enters memory and may contain private information. Review any exported handoff, screenshots, issues and logs before sharing. Large directory snapshots can be expensive; symlinks and special files are rejected in scanned paths. Locks left by an interruption require manual inspection after confirming no command is running.

## Tests, evidence and upgrades

From the repository root, run the available Node tests:

```sh
node --test direct-collab-workbench/*.test.js
node --test direct-collab-workbench-sidebar/*.test.mjs
```

Shell glob expansion varies; run from a shell that expands these patterns or invoke test files individually. Local isolated verification is limited to the commands and environment exercised; automated tests do not establish Desktop SDK compatibility, a live sidebar, other platforms or a real multi-agent review.

Before upgrading, back up `.collab`, review changes and run tests in an isolated copy. Old accepted records remain historical; old pending submissions require resubmission under the current gate, and unknown legacy coverage is not retroactively full. Test your own Desktop loading, permissions, real agent workflow, and recovery before relying on an upgrade.

## License

MIT; see [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY.md).
