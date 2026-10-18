# Workflow development validation

Validation date: 16 October 2026. Baseline: `d5a546b51f84d3d8e9aa50b01eac8d68898e2e95`.

## Local checks

| Check | Result |
| --- | --- |
| `python -m unittest discover -s tests -v` | Passed: 6 starter tests |
| `node --test tests/toolkit.test.mjs` | Passed: 34 tests, including 20 new planner tests |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed after correcting inferred report types |
| Direct Cloudflare target production build | Passed; `/workflows` included in route output |
| `git diff --check` | Passed |
| `pnpm audit --prod --audit-level=high` | Passed: no known vulnerabilities reported |
| Full hosted suite including Worker authentication, extraction and workflow persistence | Passed: 48 tests using Node 24.19.0 and the same workerd executable at a shorter temporary path |

The first Windows attempts failed with a native Node `InternalCallbackScope::Close` assertion. A separate Node 22 run exposed `spawn ... workerd.exe ENOENT`; the resolved executable path was 261 characters long even though the file existed. Copying the installed executable to a shorter temporary path and setting `MINIFLARE_WORKERD_PATH` allowed the complete suite to pass on the original Node 24.19.0 runtime. No tests were disabled and no application security setting changed. The new workflow snapshot ownership/round-trip integration case passed. Remote Linux CI was not triggered because GitHub publication was denied.

Planner checks cover reversed dependency order, inherited deadline priority, competing independent work, late tasks inside a feasible total horizon, scenario changes, fractional effort, unchanged scenarios, snapshot recalculation, malformed snapshots, all audience examples, missing/unlinked evidence, inert instruction-like evidence, dependency cycles, missing IDs, duplicates, non-finite inputs, bounds and work-conservation invariants.

## Scope and remaining gates

- No competitive target application was run. Tests use synthetic fixtures; no production data was inspected or changed.
- Browser interaction, keyboard/screen-reader behavior and responsive layout have not yet been visually verified. Source/build checks do not substitute for that review.
- Account save/reopen uses the existing API. Its new round-trip/isolation integration test passed in the local Worker/D1 runtime. Browser interaction remains a separate unverified gate.
- The new page does not configure AI, calendars, external platform data or paid services.
- No Worker, database, DNS record or production deployment was changed. Existing authentication CPU/plan and importer egress gates remain in `hosted-app/deployment/README.md`.
- Snapshot storage is bounded by existing account report limits; large plans can be exported instead. Device snapshots are unencrypted and explicitly saved.

## Review procedure

In an authorized local/staging runtime, open `/workflows`, choose each audience, load its synthetic example and calculate. Verify 18 baseline hours, 6-day completion at 3 hours/day, missing evidence, and a longer 25% effort scenario. Rename IDs and ensure dangling references fail; introduce a cycle and ensure no result is presented. Save/restore and export/import a plan, then verify editing invalidates the prior result. With disposable accounts, save/reopen and confirm a second account cannot list or delete the snapshot. Inspect narrow-screen tables and keyboard access to every action. Record actual results before public release.

The planner tests are imported by the existing `tests/toolkit.test.mjs` entry point, so existing CI executes them without changing GitHub workflow configuration.

## Publication status

GitHub metadata reads succeeded, but creating the commit tree returned HTTP 403 `Resource not accessible by integration`, including a retry requested by the owner and a reduced change set with no workflow configuration edits. No remote branch, pull request or deployment success is claimed. Changes are retained in the local `research/workflow-platform` branch and a portable patch in the investigation workspace's `reports/` directory. GitHub repository-content write access is needed to publish them.
