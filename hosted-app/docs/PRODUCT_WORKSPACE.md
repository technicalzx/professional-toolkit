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

Account saves persist the returned revision and account ownership to device storage before displaying success. If the remote commit succeeds but a device write fails, the warning distinguishes those outcomes: the previous durable device copy remains, and the new remote revision is retained in memory for a safe retry. That warning survives failed autosave attempts and clears after device recovery. Export current unsaved edits before reloading while a storage warning remains.

## Practical workflow

1. Choose an audience, enter a project title and write the brief with one concrete requirement per line.
2. Create the project, review each proposed requirement and replace suggested acceptance criteria and effort estimates with your own.
3. Record task progress and attach evidence notes to the relevant requirements and deliverables. A note records your assertion; it does not provide independent verification.
4. Save a scope baseline before making changes. Revise the brief or linked records, then inspect the affected work and estimate differences.
5. Save your work, export a backup JSON file, and download the appropriate Markdown draft for review or reuse.

Page capture connects through **Use reviewed snapshot in a project**. Review/redact first, open or create the destination project, then add the pending source. The same-tab transfer expires and clears after 15 minutes. Extension capture and snapshot/review JSON imports remain alternatives. This needs no account or AI.

The **Sources & evidence** tab stores reviewed snapshots once per project and links exact excerpts to requirements or deliverables. Client, portfolio and handover packs include currently matched excerpts with locator, capture method/time and pinned revision. Text correspondence does not establish ownership, client approval, truth or competence. JSON exports and account saves contain reviewed source content; Markdown contains linked excerpts rather than the whole corpus.

Editing/redacting a source keeps its new revision, clears old linked quotes and requires review before relinking. Removing a source clears its content/quotes while keeping repairable missing-source warnings. Baselines are reconciled at mutation, import and API save/read so they cannot retain hidden old snapshots. Device changes save before success is shown; explicitly save to the account to update that copy. Independent notes and prior downloads/shared copies remain unchanged. Sources are project-scoped; a global library is not implemented.

The **Time & actuals** tab connects recorded work to existing tasks. Upload or paste UTF-8 comma-separated CSV, read its columns, choose a stable source label, map the task/date/duration columns, then map each supplied task to a current task ID. Optionally map external IDs and notes. Dates must be real `YYYY-MM-DD` values; duration units are decimal hours, decimal minutes or `H:mm:ss`. Decimal units round to whole seconds. No provider-specific timestamp or timezone conversion is inferred.

Preview every row before importing. Same source label/external ID with unchanged content is skipped; changed content under that identity blocks the import. Without external IDs, identical normalized task/date/duration/note rows are possible duplicates, skipped by default and importable as separate sessions only through the explicit review option. Correct invalid/conflicting rows and preview again; no partial import occurs. Keep the source label stable across overlapping exports, even if file names change.

Recorded effort is shown beside current estimates and task progress. A task with no logs has unknown variance; partial logs are effort so far, not a final outcome or proof of under-budget delivery. Logs never complete tasks or reduce the independent remaining-estimate total. Scope revisions preserve historical logs when tasks disappear and show unmatched work separately. No actual expenditure, billing or calendar conflict is inferred. Current scope estimates may change; these comparisons are not a historical rate/estimate ledger.

Time imports and deletion persist to the device before success is shown. Save to account explicitly to update its copy; the panel previews the combined account-document size and warns when it exceeds 60 KB. Scope baselines hold no time records, including imported old baselines. Account clients omitting time fields cannot erase existing server logs. The raw CSV file is not retained. Project JSON preserves exact reviewed records; time CSV neutralizes spreadsheet formula strings and is a presentation export, so dangerous strings and removed-task rows are not guaranteed a lossless CSV reimport. Markdown work packs include aggregates/source labels and omit raw time notes. Delete or clear the recorded entries only after exporting anything you need to retain; prior exports and external copies are independent.

Capture does not automatically verify claims or ingest private platform data. Optional AI review still requires model configuration, consent and sign-in on the full backend.

## Bounds and limitations

The engine permits up to 20 requirements, 20 deliverables and 40 tasks per project; task dependencies must be acyclic and refer to existing records. Planning spans 1–90 working days with constant daily capacity. Projects support 12 sources and eight links per requirement/deliverable, with excerpts of at most 600 characters. Projects support at most 200 time entries. CSV input supports 200 data rows, 40 columns and 200 KB of UTF-8 text. JSON projects are limited to 300 KB. Full-backend account documents, including the baseline, must fit within 60 KB; accounts hold up to 20 projects, independently of the existing 50-report quota. Project writes are limited to 100 attempts per account in a fixed 15-minute window.

Brief extraction uses explicit line rules; it does not infer a complete work breakdown or understand arbitrary prose. Initial tasks have placeholder estimates of two production hours and one verification hour. Exact matching preserves unchanged brief-line records; rewritten wording becomes removed and added scope. Manually review the proposal and its dependency changes.

Planning is a deterministic one-person heuristic, not an optimal team scheduler or a calendar integration. Estimates exclude platform fees, taxes, exchange rates and actual expenditure. Evidence and completion states are manual records; the application does not establish client approval, skill mastery, ranking, employment eligibility or business outcomes. Markdown formats adapt the presentation of the same project records; they do not add independently researched facts.

Device storage is unencrypted and local to this browser origin. Export before switching origins/devices or clearing browser storage. Account synchronization requires the full backend and its deployment prerequisites. The client-only Cloudflare preview supports local workflows and exports, but does not enable accounts, remote URL fetching or AI. This release implements the project workflow described here; the broader research roadmap remains open.

## Contributor verification

Run `node --test "tests/*.test.mjs"`, TypeScript checking and the production build from `hosted-app`. Project engine tests exercise scope propagation, validation and exports; project storage tests exercise ownership, revision conflicts and quotas. Preview packaging tests check routes, binary downloads and repeatable packaging. The CI pipeline also builds and checks the client-only preview. Record browser acceptance and deployed-version results separately from synthetic tests.

Browser acceptance runs `node scripts/verify-project-browser.mjs` from the repository root against an already running application. Set `TOOLKIT_PREVIEW_URL` to its loopback origin (default `http://127.0.0.1:8791`). Playwright must be available as `playwright` or through `TOOLKIT_PLAYWRIGHT_MODULE`, an absolute path to its installed package. `TOOLKIT_CHROME` optionally selects an installed Chrome executable; otherwise Playwright uses its installed Chromium. `TOOLKIT_BROWSER_OUTPUT` optionally names a directory for synthetic screenshots.

Set `TOOLKIT_VERIFY_ACCOUNT=1` only against an isolated full Worker/D1 development environment to include account registration, project saves, revision-preserving import, device removal and account restore. It creates and removes its own synthetic account. Leave this unset for the client-only preview, which intentionally has no account backend. The script also checks evidence gates, scope impact, Markdown/JSON, reload, audience examples and mobile navigation. CI installs pinned Playwright 1.64.1 separately from production dependencies and runs guest acceptance against the built preview.

Local release verification on 16 October 2026 recorded 85 automated checks passing, a successful production build, guest browser acceptance and the isolated Worker/D1 account round trip. Public deployment status and GitHub CI results must be checked against the published commit separately; these local results do not establish that a hosted version has updated.

The evidence browser regression is `node scripts/verify-evidence-browser.mjs` from the repository root with the same environment variables. It covers capture transfer, deduplication, exact links, multiple output formats, baseline privacy, storage failure, transfer expiry and narrow-screen navigation. Account mode uses only its own isolated synthetic user. See the [research decision](../../reports/2026-10-17/EVIDENCE_LIBRARY_RESEARCH.md) and [continuous backlog](../../docs/CONTINUOUS_BACKLOG.md).

The time-log browser regression is `node scripts/verify-time-browser.mjs` from the repository root, with the same browser environment variables. It checks explicit mapping, duplicate/conflict review, atomic persistence failure, no-ID sessions, duration formats, exports, scope-removal retention, deletion, reload and mobile keyboard use. Optional account mode saves populated and cleared logs and deletes its own synthetic account. See [time-log research](../../reports/2026-10-17/TIME_LOG_RESEARCH.md) and its separate validation report.
