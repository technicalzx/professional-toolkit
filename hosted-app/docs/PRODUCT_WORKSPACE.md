# Project workspace

The root application connects a brief, requirements, deliverables, tasks, evidence, scope revisions and reusable outputs in one project. It provides three starting workflows: client delivery for freelancers, reproducible project evidence for students, and architecture decisions and handover for professionals. The supporting tool directory remains at `/tools`; page snapshots at `/capture`; the earlier standalone planner at `/workflows`.

## What it does

- A nonblank brief line proposes one requirement, a deliverable and production/verification tasks. Review the proposed scope, acceptance criteria and placeholder effort before committing to it. Templates use synthetic project content.
- Stable IDs connect requirements, deliverables and task dependencies. Requirement states distinguish proposed, confirmed and accepted scope; task/deliverable states distinguish todo, doing and done. An accepted requirement or completed deliverable requires its own evidence note.
- Planning checks a single person's supplied working-day capacity, dependencies, deadlines and estimated effort budget. Remaining effort is shown separately from total committed scope.
- Scope comparison identifies added, removed and changed requirements, linked deliverables, and downstream task impact. Comparing a saved baseline with revised scope also shows changes to effort, capacity, completion day and estimated budget. Currency changes disable a misleading direct budget comparison.
- JSON import validates records and references; derived results are recomputed. Markdown exports produce editable client-review, handover or portfolio drafts with source records, missing-evidence notices, estimates and assumptions.
- Device storage and JSON export support guest use. On the full backend, `/api/projects` saves private project documents with revision conflict checks, a persistent scope baseline and account ownership enforcement. Concurrent edits return a conflict instead of silently overwriting one another.

Removing a project from the device leaves its account copy available for restoration. **Delete account copy** separately removes the current saved revision after confirmation and keeps the device copy. An account conflict requires reloading the saved version after exporting any local edits you need to retain.

## Practical workflow

1. Choose an audience, enter a project title and write the brief with one concrete requirement per line.
2. Create the project, review each proposed requirement and replace suggested acceptance criteria and effort estimates with your own.
3. Record task progress and attach evidence notes to the relevant requirements and deliverables. A note records your assertion; it does not provide independent verification.
4. Save a scope baseline before making changes. Revise the brief or linked records, then inspect the affected work and estimate differences.
5. Save your work, export a backup JSON file, and download the appropriate Markdown draft for review or reuse.

Page capture remains a separate input workflow. The Chrome extension can transfer a loaded, user-reviewed profile/page snapshot without a toolkit account; JSON import is an alternative. Capture does not automatically create verified project claims or ingest private platform data. Optional AI review requires a configured model, consent and sign-in on the full backend.

## Bounds and limitations

The engine permits up to 20 requirements, 20 deliverables and 40 tasks per project; task dependencies must be acyclic and refer to existing records. Planning spans 1–90 working days with constant daily capacity. JSON projects are limited to 300 KB. Full-backend account documents, including the baseline, must fit within 60 KB; accounts hold up to 20 projects, independently of the existing 50-report quota. Project writes are limited to 100 attempts per account in a fixed 15-minute window.

Brief extraction uses explicit line rules; it does not infer a complete work breakdown or understand arbitrary prose. Initial tasks have placeholder estimates of two production hours and one verification hour. Exact matching preserves unchanged brief-line records; rewritten wording becomes removed and added scope. Manually review the proposal and its dependency changes.

Planning is a deterministic one-person heuristic, not an optimal team scheduler or a calendar integration. Estimates exclude platform fees, taxes, exchange rates and actual expenditure. Evidence and completion states are manual records; the application does not establish client approval, skill mastery, ranking, employment eligibility or business outcomes. Markdown formats adapt the presentation of the same project records; they do not add independently researched facts.

Device storage is unencrypted and local to this browser origin. Export before switching origins/devices or clearing browser storage. Account synchronization requires the full backend and its deployment prerequisites. The client-only Cloudflare preview supports local workflows and exports, but does not enable accounts, remote URL fetching or AI. This release implements the project workflow described here; the broader research roadmap remains open.

## Contributor verification

Run `node --test "tests/*.test.mjs"`, TypeScript checking and the production build from `hosted-app`. Project engine tests exercise scope propagation, validation and exports; project storage tests exercise ownership, revision conflicts and quotas. Preview packaging tests check routes, binary downloads and repeatable packaging. The CI pipeline also builds and checks the client-only preview. Record browser acceptance and deployed-version results separately from synthetic tests.

Browser acceptance runs `node scripts/verify-project-browser.mjs` from the repository root against an already running application. Set `TOOLKIT_PREVIEW_URL` to its loopback origin (default `http://127.0.0.1:8791`). Playwright must be available as `playwright` or through `TOOLKIT_PLAYWRIGHT_MODULE`, an absolute path to its installed package. `TOOLKIT_CHROME` optionally selects an installed Chrome executable; otherwise Playwright uses its installed Chromium. `TOOLKIT_BROWSER_OUTPUT` optionally names a directory for synthetic screenshots.

Set `TOOLKIT_VERIFY_ACCOUNT=1` only against an isolated full Worker/D1 development environment to include account registration, project saves, revision-preserving import, device removal and account restore. It creates and removes its own synthetic account. Leave this unset for the client-only preview, which intentionally has no account backend. The script also checks evidence gates, scope impact, Markdown/JSON, reload, audience examples and mobile navigation. CI installs pinned Playwright 1.64.1 separately from production dependencies and runs guest acceptance against the built preview.

Local release verification on 16 October 2026 recorded 85 automated checks passing, a successful production build, guest browser acceptance and the isolated Worker/D1 account round trip. Public deployment status and GitHub CI results must be checked against the published commit separately; these local results do not establish that a hosted version has updated.
