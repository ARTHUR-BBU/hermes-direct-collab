# Synthetic test fixtures

Rebuild the data fixtures with `node direct-collab-workbench/fixtures/generate.cjs` from the repository root. The generator uses a fresh temporary directory and only literal strings in its own source, invokes the local CLI, deletes the temporary project, and never reads an existing project or another fixture. Timestamps are fixed to `2020-01-01T00:00:00.000Z` for reproducibility.

- `legacy-synthetic-state.json`: produced from literal artifact, review and verification content through an actual CLI lifecycle. Coverage fields are removed afterward to model historical accepted records. It is not evidence of a real historical workflow.
- `calculator-index.html`: an invented minimal document written literally by the generator as arbitrary snapshot content; it is not a calculator application.
- `projection-baseline.json`: generated from the synthetic ledger, an empty ledger, and two deliberate corruptions (invalid event timestamp and invalid task ID). Expected projections and errors come from the current core: this is a regression snapshot, **not an independent correctness oracle**. Separate tests provide lifecycle and corruption assertions.

Regeneration may change expected snapshots when implementation changes; review the diff rather than blindly accepting it. Fixture provenance does not establish provenance or permission for other repository files.
