# DIRECT collaboration workbench

[中文](README.md) · [Project README](../README.md)

This local Node standard-library CLI records tasks, human progress, review and verification evidence, and generates a Chinese handoff. It does not launch agents, perform review or tests, manage credentials, or provide a board, service, cloud sync or cross-machine lock. Node 18+ is targeted; the local tests used Node 22. Run `node --test` in this directory. Pass an absolute project path with `--project`; otherwise the current directory is used. Output is JSON; exit 0 indicates success, 1 failure. Back up important projects first. `init` creates `.collab` and refuses to overwrite an existing one.

## Example

From the repository root in Windows Git Bash, set `PROJECT` to the native path of an existing project. It must already contain ordinary files `src.js`, `review.txt`, and `verify.txt`. The people performing review and verification must write their actual evidence first, without passwords or keys. This is a CLI example, not proof that those actions occurred. On POSIX use `PROJECT='/absolute/path/to/existing-project'` instead and `DIRECT_COLLAB_CLI="$PWD/direct-collab-workbench/cli.js"`.

```sh
export DIRECT_COLLAB_CLI="$(cygpath -m "$PWD/direct-collab-workbench/cli.js")"
PROJECT="$(cygpath -m '/f/path/to/existing-project')"
node "$DIRECT_COLLAB_CLI" init --project "$PROJECT"
node "$DIRECT_COLLAB_CLI" create --project "$PROJECT" --json '{"id":"t1","goal":"Implement feature","owner":"owner-example","paths":["src.js"],"interfaces":["CLI"],"acceptance":"Tests pass","budgetMinutes":30}'
node "$DIRECT_COLLAB_CLI" start --project "$PROJECT" --json '{"id":"t1"}'
node "$DIRECT_COLLAB_CLI" progress --project "$PROJECT" --json '{"id":"t1","evidence":"Changes completed","next":"Check tests"}'
node "$DIRECT_COLLAB_CLI" submit --project "$PROJECT" --json '{"id":"t1"}'
node "$DIRECT_COLLAB_CLI" review --project "$PROJECT" --json '{"id":"t1","reviewer":"reviewer-example","result":"pass","evidence":"review.txt","coveredPaths":["src.js"]}'
node "$DIRECT_COLLAB_CLI" accept --project "$PROJECT" --json '{"id":"t1","evidence":"verify.txt"}'
node "$DIRECT_COLLAB_CLI" status --project "$PROJECT"
node "$DIRECT_COLLAB_CLI" handoff --project "$PROJECT"
```

`handoff` returns a `markdown` JSON field; the caller may save it to a new file. It does not overwrite a project handoff. Saved output is a timestamped snapshot, not a live view: rerun `handoff` or `status` when taking over. Historical acceptance remains visible, but changed, missing or unreadable files or evidence trigger a freshness warning. `status` includes state, history, `overdue` and `stale`; overdue is a reminder, not proof a process has died or work is valid. `stale` indicates missing files or mismatched SHA-256.

Progress evidence and `next` are historical human statements. `status.tasks[]` includes `progressIsHistorical` and a state/freshness-derived `currentNext`; `handoff` displays historical progress and next step alongside current suggestions. Suggestions do not mean any action was performed. Handle blocks first; resubmission clears the previous review. An accepted but stale task cannot be resubmitted: the operator must decide whether to create another task. No automatic revocation or creation occurs. Old state needs no migration, but consumers of old handoff labels must adapt.

## Commands and rules

Each mutation takes `--json` with the fields below; `init`, `status`, and `handoff` do not need JSON.

- `create`: required `id`, `goal`, `owner`, nonempty relative `paths` array, nonempty string `interfaces` array, `acceptance`, and positive `budgetMinutes`. Paths may initially be missing, but must exist at submission. Use `/`; absolute paths, `..`, `.collab`, symlinks and hard links to current internal files are forbidden.
- `start`: `id`; checks exclusive paths of other active/review tasks and tasks blocked from those states, including directory descendants, Windows case aliases and existing hard links. `progress`: `id`, concrete `evidence` text, and `next`. Never record secrets.
- `process`: `id`, positive integer `pid`, nonempty `session`, and integer `exitCode` or `null` if unknown; available in active, blocked and review. Repeated calls replace the current record while history retains snapshots. This is a human declaration, not a process check or proof of progress or recoverability; do not record sensitive information.
- `block`: `id`, `reason`; active/review retains ownership while blocked, draft does not. `resume`: `id`, restores the previous state and checks conflicts. `cancel`: `id`, `reason`, releases ownership; cancellation is not acceptance.
- `submit`: `id`; hashes files or directory structure and file hashes and enters review. Resubmission clears the previous review. `review`: `id`, `reviewer`, `result` (`pass` or `fail`), `evidence` (existing project file), and required `coveredPaths` (nonempty, no duplicates, exact submitted paths). Reviewer and owner must differ by exact string comparison, which does not prove independence. Evidence files belong outside all submitted paths and directories so they do not invalidate the snapshot. A directory is one complete path unit; a child or alias does not substitute. Partial coverage may be recorded but cannot be accepted; declared scope does not prove review occurred.
- `rework`: `id`, nonempty `reason` while in review; returns to active, retains ownership and history, and clears current review. Modify, resubmit and review again. Legacy pending submissions require resubmission before new review. Old accepted records remain historical with `legacy-unknown` coverage. Read-only queries do not migrate or overwrite old ledgers; new operations append history and ledger version remains 1.
- `status.tasks[].coverage` is `none`, `partial`, `full` or `legacy-unknown`; `uncoveredPaths` is an array or `null` when unknown. Handoff also shows scope and uncovered paths. Unknown does not mean full.
- `accept`: `id`, `evidence` (a different file from review evidence; hard-link aliases do not count). The latest submission must have the scope gate and a full passing review; legacy pending submissions require resubmission and review. Current submitted-file and review-evidence hashes must match; the CLI hashes the verification file. Read `status` again to detect later changes.
- `status` and `handoff` do not change history. Each task-operation snapshot is appended to `.collab/state.json` history; this file is the sole state entry. Corruption or loss causes refusal, not guessing. Replay rejects new-gate historical acceptance if normalized review and verification evidence paths coincide; legacy ungated history remains readable. Pure replay cannot inspect hard links, whereas `accept` checks file identity. Windows path comparisons ignore case and trailing dots/spaces in components; the sidebar conservatively uses Windows comparison when platform is unknown, potentially rejecting otherwise valid case-distinct evidence on case-sensitive systems.

## Security and limitations

Path checks, file existence, hashes, a local exclusive lock, temporary-file replacement and pre-persistence replay reduce accidental errors. Pure replay cannot inspect filesystem identity; old ungated history remains compatible but cannot prove age, freshness or identity. Locks are not distributed. After interruption, inspect `.collab/lock` and remove it only after confirming no command is running. Users with filesystem access can forge names, evidence or state; separate identities/files and SHA-256 do not prove independence, truth, actual tests or correct conclusions. This is not a sandbox and cannot prevent hostile processes with equivalent access racing file changes or bypassing locks. Use trusted local projects and accounts; never record credentials, environment values or sensitive logs. Hashing is not an atomic snapshot against malicious concurrent changes.

Directory scans can be expensive; they capture contents, structure and names, not metadata such as permissions or timestamps, and reject symlinks and special files. Conflict and hard-link checks depend on reliable device/file identifiers and cannot guarantee exclusivity during renames, replacements or concurrent changes. Internal-file hard-link checks only cover current `.collab` files; a link to an old state file after atomic replacement no longer points to current state. Replay checks history commands, state transitions, unauthorized changes and final consistency, but cannot detect every valid-looking deletion, rollback or coordinated forgery. The ledger is unsigned and has no external trust anchor. Other operating systems and network shares have not been verified.
