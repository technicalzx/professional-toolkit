# Continuous improvement record

Durable handoff for the five-hour schedule. Verify code and open PRs before using these statuses. Research ideas remain hypotheses until tested with users.

## 17 October 2026: source-to-project evidence

- Base: PR #9, `feature/productive-workspace`, `88833ed`; open and checks green at run start.
- Already implemented: audience projects; requirements, deliverables and dependent tasks; manual evidence; scope baselines/impact; work packs; revision-safe private accounts; page/extension capture.
- This run: project-scoped sources, pinned exact excerpts and provenance in work packs, connecting capture to project delivery.
- [Research and architecture](../reports/2026-10-17/EVIDENCE_LIBRARY_RESEARCH.md); [verification](../reports/2026-10-17/EVIDENCE_LIBRARY_VALIDATION.md). Branch implementation is distinct from public production deployment and verified profile claims.

## 17 October 2026: time logs connected to scope

- Base: PR #9, `feature/productive-workspace`, `83df770`; open and all checks green at run start. Milestones: `06ad690` (domain/private storage) and `1f1ff02` (usable UI, atomic persistence and browser regression).
- This run adds project-local CSV time import, explicit column/task mapping, external-ID reconciliation, reviewed possible duplicates, historical-task retention and estimate-versus-recorded-effort feedback. It reuses project envelopes; no new provider, runtime dependency or migration.
- [Research, license and architecture decisions](../reports/2026-10-17/TIME_LOG_RESEARCH.md). [Verification](../reports/2026-10-17/TIME_LOG_VALIDATION.md) distinguishes local acceptance, hosted checks and release status. Missing logs remain unknown; all actual-time claims are supplied records.

## Next useful slices

0. **Hosted preview acceptance - externally blocked.** Pages reports uploaded previews, but Chrome receives 404 from immutable and branch URLs; some command-line signatures receive 403/1010. The current Cloudflare connection cannot access the hosting account referenced by GitHub. Owner reconnection has been requested. Once accessible, inspect the exact deployment/configuration and fix the verified cause before claiming hosted acceptance. Preserve production/security settings; do not repeat the same authorization request on unchanged runs. Local preview and PR validation remain available.
1. **Cross-project commitments.** Reuse the planner against shared availability. Acceptance: expose conflicts between individually feasible projects, state time-off/time-zone assumptions, preserve accepted scope during what-if exploration.
2. **Verified time-source adapters.** Collect synthetic exports and stable IDs from a specific maintained provider before claiming direct compatibility. Decide explicit offset/timezone semantics and test overlapping exports, DST boundaries, renamed tasks and correction conflicts. Keep the bounded generic adapter available; JSON remains the lossless backup. No automatic invoicing or actual-spend claims without rate/billing records.
3. **Cross-project approved sources.** Define ownership, revision propagation and deletion across every referencing project before introducing shared source identities. Avoid silently duplicating private snapshots.

## Run discipline

Finish active work and repair failures before adding another slice. Recheck PR #9 while open; after merge use the updated default branch. Separate coherent domain/API, UI/integration and independently useful documentation/repair commits when ready, keeping tests with behavior. Preserve unrelated edits, data, notices, real authorship and timestamps. Verify CI against the published SHA. Current authorization leaves merges and production release for owner review.
