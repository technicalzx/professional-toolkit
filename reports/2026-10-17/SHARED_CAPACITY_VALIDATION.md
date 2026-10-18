# Shared-capacity validation

Research and initial checks: 17 October 2026 UTC. Final verification continued on 18 October in Asia/Karachi. Starting revision `37f160e`; existing open PR #9 on `feature/productive-workspace`. Remote verified as `https://github.com/technicalzx/professional-toolkit.git`; initial working tree clean. PRs 1–8 were dependency updates, not duplicate feature work. Scope: independent cross-project capacity scenarios; no project schema or database migration, provider, dependency, production setting or remote data change.

## Observed checks

| Check | Observed result |
| --- | --- |
| Python repository suite | 6 passed. |
| Hosted Node unit/integration suite | 143 passed, zero failures/skips. Includes 18 aggregate scheduling tests, five scenario-storage tests and private immutable report integration. |
| TypeScript | `tsc --noEmit` passed; component review also passed with incremental state disabled. |
| Dependency audit | `pnpm audit --prod --audit-level=high`: no known vulnerabilities reported. |
| Full Cloudflare build | All five Vinext stages passed in isolated `.sites-runtime/cap-20261017`, reusing installed dependencies. 195 copied source files matched the source manifest; no drift at build verification. |
| Guest preview build and packaging | Passed production Vite build, route/package checks, guest API behavior and exact extension-download bytes. |
| Existing guest browser journeys | Project, capture/evidence and time-log scripts all passed against the new guest preview on isolated port 8795. |
| New capacity guest browser journey | Passed comparison, resolution, overrides, canonical import/export, missing/stale references, quota/deletion, storage failure, reload and 390px keyboard interaction. |
| New capacity full Worker/D1 browser journey | Passed on isolated port 8794, including new-tab sign-in refresh, missing project restoration, forced device-write failure and retry, immutable private snapshots and deletion. Cleanup returned HTTP 200 before PASS. |
| Independent synthetic database cleanup | Read-only counts after account acceptance: users=0, reports=0, sessions=0, recovery_codes=0. No user record content inspected. |

Runtime tests use the configured short `MINIFLARE_WORKERD_PATH` to avoid the known Windows long-path native failure. Local Miniflare/Worker verification uses compatibility date `2026-05-15`; the generated production date remains `2026-10-12`.

## Behavior and evidence

The browser creates two synthetic projects with the same task IDs and six supplied hours each. Both fit alone within two days at four hours per day, while combined work exceeds the shared eight-hour budget. Increasing shared capacity resolves the observed conflict. A zero-hour override brings the conflict back. Independent engine tests also exercise two eight-hour projects and all 800 tasks across 20 projects, downstream prerequisites, future releases, daily reprioritization, fractional conservation and zero capacity.

Scenario changes leave the original project records byte-for-byte unchanged. Imported computed results are discarded. Invalid imports retain the current draft and saved configuration. Missing references block a result; changed timestamps show a review warning and refresh action. Large invalid horizon input cannot allocate an unbounded override array. Saving past the five-scenario device bound fails without discarding records; deleting another scenario preserves the current saved selection.

A forced capacity-storage write failure leaves the last durable value and current unsaved draft intact. The account restoration test separately fails the project-storage write, verifies no success notice or replacement, restores storage and retries successfully using a freshly read session. Loading account project copies now persists the normalized merged workspace before publishing success. Account capacity snapshots contain only configuration/references, use distinct cloud IDs even for the same scenario ID, and share the existing 50-report quota. Private ownership and foreign deletion protection are covered in the Worker integration suite. Legacy tool reports exclude these configurations and direct users to their own workspace.

Markdown recomputes from current records and omits source/evidence/time corpora and private override reasons. JSON retains reviewed configuration reasons and references, without a project corpus or derived results. Browser tests verify these differences. All fixtures are synthetic; no supplied profile data or authentication tokens are included in this report or the screenshots.

Final visual review found that the global input-width rule stretched project-selection checkboxes. A scoped 18px checkbox/layout rule fixes it; a computed-size/side-by-side assertion now covers the repair. Both the full five-stage build and guest preview were rebuilt. The guest and full-account capacity journeys passed again, followed by zero fixture counts.

Synthetic screenshots: [desktop](assets/capacity-shared.png), [390px mobile](assets/capacity-mobile.png). Tables scroll in their own containers. Keyboard and overflow checks are browser acceptance, not a formal assistive-technology conformance audit.

## Historical failure emails investigated

The owner supplied emails for `1f1ff02` and `0c8378b`. GitHub's historical job logs confirm both failed at `verify-time-browser.mjs:60`, where the test read `timeEntries` from a project not yet saved by the debounced device persistence. Earlier unit, type, production build and preview checks in those jobs had passed. The reports describe the same timing defect, not a token authentication failure.

- [Run for 1f1ff02](https://github.com/technicalzx/professional-toolkit/actions/runs/39004346815), job 117313629208.
- [Run for 0c8378b](https://github.com/technicalzx/professional-toolkit/actions/runs/39004557000), job 117314252207.
- [Repair d042c2d](https://github.com/technicalzx/professional-toolkit/commit/d042c2d5d23d1822af41ace14ad176ad557d452d) waits for observable durable records; the assertions remain. The later account revision durability repair is documented in [time-log validation](TIME_LOG_VALIDATION.md).

Historical runs retain their original failure status. The current branch's successful runs and new local guest acceptance establish that the repaired journey passes; rerunning obsolete broken revisions would not validate current source. The existing authenticated Git sign-in successfully pushed the engine milestone. No token supplied in chat was needed, installed, committed or recorded.

## Publication and hosting boundary

The independently tested engine milestone `f91513c` was pushed promptly; all its GitHub checks passed, including both Contributor checks, CodeQL and Pages upload. The usable UI/storage/browser integration milestone `7be09eb` was then pushed after local acceptance. Research/verification is published as a separate reviewable milestone. Final published revision and CI status are checked against the exact head, not inferred from an earlier green run.

GitHub Pages upload success is separate from hosted acceptance. The previously observed preview 404 / some-client 403 boundary remains unresolved: the connected Cloudflare account does not include the hosting account referenced by GitHub. This run confirmed that account mismatch read-only and did not change security settings or repeat the unchanged access request. Local acceptance is verified; public hosted acceptance and production release are not claimed. PR #9 remains open for owner review; no merge or production release was performed.
