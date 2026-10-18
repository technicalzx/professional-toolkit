# Evidence library validation — 17 October 2026

## Observed local results

Runtime feature commits: `71038f4` (source model/private persistence), `c479451` (capture/project interface and browser regression). CodeQL findings in test-only partial escaping and URL-substring assertions were addressed with an explicit expected Markdown fixture and structural source-deletion assertions. No scanner rule was disabled.

| Check | Observed result |
| --- | --- |
| `node --test "tests/*.test.mjs"` from hosted-app | 104 passed; zero failures/skips. Includes 12 new source-engine cases, four workspace/baseline cases, two handoff cases and the expanded Worker/D1 suite. |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed with the canonical shared project types. |
| Cloudflare production build with `TOOLKIT_DEPLOY_TARGET=cloudflare` | All five Vinext stages passed in an isolated build directory. |
| Vite client preview build, `preview/pack-worker.mjs`, `preview/check-worker.mjs` | Passed, including routes, private-write rejection and identical extension ZIP bytes. |
| `pnpm audit --prod --audit-level=high` | No known vulnerabilities reported. |
| `scripts/verify-evidence-browser.mjs`, installed Chrome, full isolated Worker/D1 backend | Passed capture transfer, two target links from one source, duplicate import, invalid excerpt rejection, client/portfolio reuse, provenance and unused-corpus exclusion. |
| Same evidence browser regression | Passed source revision/removal, current and baseline JSON scrubbing, storage failure, immediate device persistence, idle draft expiry and narrow-screen keyboard navigation. |
| Evidence browser account mode | Saved original, redacted and removed sources; checked project/baseline privacy in server responses; removed its own synthetic account. |
| Existing `scripts/verify-project-browser.mjs` with isolated account mode | Passed original brief/delivery/scope/export/import/reload flow, separate same-audience projects, all three audience work packs, private restore/deletion and mobile navigation. |

Desktop and 390px screenshots were inspected: [source library](assets/evidence-library.png), [mobile evidence controls](assets/evidence-mobile.png). Screenshot contents are synthetic. No owner credentials or requested live profiles were used.

The installed local workerd required the CLI compatibility-date override `2026-05-15`; generated production configuration retains `2026-10-12`. Worker/D1 integration tests use the same supported local date. No production database, migrations, billing settings or Cloudflare resources were changed by these checks.

## Repairs discovered during verification

An imported old baseline could have retained a source removed from the current record. Central baseline normalization now removes/replaces stale source content and clears unusable excerpts, including forged same-revision snapshots. API regression checks the persisted D1 document as well as the response.

An older client could have omitted newly introduced source fields when saving. Such updates now return `409 PROJECT_CLIENT_OUTDATED` when the stored record contains evidence, preserving the account copy.

Browser acceptance initially completed its feature checks but failed synthetic-account cleanup because the HTTP API-request client did not send the Secure loopback cookie. Cleanup now uses the authenticated browser page, and PASS is reported only after cleanup succeeds. The single leftover record from that first run was identified by exact synthetic account ID/name and matching test project, removed from the isolated test database, and its dependent rows were verified absent. The final browser run passed cleanup.

## Remote and release boundary

Changes continue in [PR #9](https://github.com/technicalzx/professional-toolkit/pull/9). GitHub runs the new guest evidence journey alongside the original browser regression. Check its latest SHA/status separately from this local record. The existing GitHub-connected Cloudflare Pages integration generated a branch preview after a push, but unauthenticated root/capture/account requests from this environment returned `403` with Cloudflare error `1010`. Hosted browser acceptance could not proceed. A successful deployment check alone does not establish access or account/backend correctness; security settings were not changed to bypass that boundary.

Evidence remains user-supplied and project-scoped. Live platform layouts, ownership, competence, customer impact and the broader AI roadmap are unverified or unfinished. Source deletion cannot recall independently written notes, exports, shared files or other copies. Merge and production release remain for owner review.
