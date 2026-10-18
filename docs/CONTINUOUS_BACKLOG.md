# Continuous improvement record

Durable handoff for the five-hour schedule. Verify code and open PRs before using these statuses. Research ideas remain hypotheses until tested with users.

## 17 October 2026: source-to-project evidence

- Base: PR #9, `feature/productive-workspace`, `88833ed`; open and checks green at run start.
- Already implemented: audience projects; requirements, deliverables and dependent tasks; manual evidence; scope baselines/impact; work packs; revision-safe private accounts; page/extension capture.
- This run: project-scoped sources, pinned exact excerpts and provenance in work packs, connecting capture to project delivery.
- [Research and architecture](../reports/2026-10-17/EVIDENCE_LIBRARY_RESEARCH.md); [verification](../reports/2026-10-17/EVIDENCE_LIBRARY_VALIDATION.md). Branch implementation is distinct from public production deployment and verified profile claims.

## 17 October 2026: time logs connected to scope

- Base: PR #9, `feature/productive-workspace`, `83df770`; open and all checks green at run start. Milestones: `06ad690` (domain/private storage) and `1f1ff02` (usable UI, atomic persistence and browser regression).
- Account save/reload verification also hardened immediate revision-metadata persistence and safe retry after remote success plus device-write failure. See the validation record for the observed CI timing repair and account regression.
- This run adds project-local CSV time import, explicit column/task mapping, external-ID reconciliation, reviewed possible duplicates, historical-task retention and estimate-versus-recorded-effort feedback. It reuses project envelopes; no new provider, runtime dependency or migration.
- [Research, license and architecture decisions](../reports/2026-10-17/TIME_LOG_RESEARCH.md). [Verification](../reports/2026-10-17/TIME_LOG_VALIDATION.md) distinguishes local acceptance, hosted checks and release status. Missing logs remain unknown; all actual-time claims are supplied records.

## 17 October 2026: shared cross-project commitments

- Base: PR #9, `feature/productive-workspace`, `37f160e`; open, clean and all checks green at run start. Published milestones: `f91513c` (bounded aggregate engine and its 18 behavior tests), `7be09eb` (usable integration, durable device/account snapshots and browser acceptance).
- Current slice connects canonical projects to independent capacity configurations: explicit start alignment, one shared availability pool, daily overrides, solo/shared comparison, current-source warnings, device scenarios, private immutable account snapshots and exports. Source scope, evidence, time logs and baselines remain unchanged. Calendar dates, holidays, timezone inference, teams and an optimality claim remain out of scope.
- [Research and license decisions](../reports/2026-10-17/SHARED_CAPACITY_RESEARCH.md); [observed verification](../reports/2026-10-17/SHARED_CAPACITY_VALIDATION.md). Runtime acceptance and final pushed-SHA checks are recorded there separately from this status.

## Next useful slices

0. **Live deployment and operational follow-up.** Full Worker live at https://professional-toolkit.abihurairahansari.workers.dev, verified with loaded-extension synthetic acceptance and all four browser journeys. Wrangler OAuth reaches the correct account; the plugin still targets another account. See [deployment evidence](../hosted-app/deployment/LIVE_DEPLOYMENT.md). Prioritize reproducing workflow prefetch/favicons 404 and measuring slow account/D1 requests before extra features. Do not copy private account content into logs, weaken password security, change billing or migrate databases without evidence. Owner real-platform extension acceptance remains manual. The five-hour schedule includes live health/error/performance checks; old Pages preview acceptance is separate.
1. **Dated availability discovery, after user workflow evidence.** Shared numbered-day capacity is implemented. Before adding calendar dates, collect concrete start/deadline examples and define ordinal-to-date mapping, workweek, explicit time-off and timezone behavior. Preserve accepted deadlines; do not silently shift them or infer availability from partial time logs. This is a follow-up design gate, not a missing claim in the current abstract-day tool.
2. **Verified time-source adapters.** Collect synthetic exports and stable IDs from a specific maintained provider before claiming direct compatibility. Decide explicit offset/timezone semantics and test overlapping exports, DST boundaries, renamed tasks and correction conflicts. Keep the bounded generic adapter available; JSON remains the lossless backup. No automatic invoicing or actual-spend claims without rate/billing records.
3. **Cross-project approved sources.** Define ownership, revision propagation and deletion across every referencing project before introducing shared source identities. Avoid silently duplicating private snapshots.

## Run discipline

Finish active work and repair failures before adding another slice. Recheck PR #9 while open; after merge use the updated default branch. Separate coherent domain/API, UI/integration and independently useful documentation/repair commits when ready, keeping tests with behavior. Preserve unrelated edits, data, notices, real authorship and timestamps. Verify CI against the published SHA. Current authorization leaves merges and production release for owner review.
