# Continuous improvement record

Durable handoff for the five-hour schedule. Verify code and open PRs before using these statuses. Research ideas remain hypotheses until tested with users.

## 17 October 2026: source-to-project evidence

- Base: PR #9, `feature/productive-workspace`, `88833ed`; open and checks green at run start.
- Already implemented: audience projects; requirements, deliverables and dependent tasks; manual evidence; scope baselines/impact; work packs; revision-safe private accounts; page/extension capture.
- This run: project-scoped sources, pinned exact excerpts and provenance in work packs, connecting capture to project delivery.
- [Research and architecture](../reports/2026-10-17/EVIDENCE_LIBRARY_RESEARCH.md); [verification](../reports/2026-10-17/EVIDENCE_LIBRARY_VALIDATION.md). Branch implementation is distinct from public production deployment and verified profile claims.

## Next useful slices

1. **Estimate-to-actual delivery feedback.** Research maintained time-tracking projects such as Solidtime and Midday and their current licenses. Import CSV with explicit mapping, deduplication and date/time provenance. Acceptance: repeat import changes nothing, ambiguous rows are actionable, variance links to recorded scope.
2. **Cross-project commitments.** Reuse the planner against shared availability. Acceptance: expose conflicts between individually feasible projects, state time-off/time-zone assumptions, preserve accepted scope during what-if exploration.
3. **Cross-project approved sources.** Define ownership, revision propagation and deletion across every referencing project before introducing shared source identities. Avoid silently duplicating private snapshots.

## Run discipline

Finish active work and repair failures before adding another slice. Recheck PR #9 while open; after merge use the updated default branch. Separate coherent domain/API, UI/integration and independently useful documentation/repair commits when ready, keeping tests with behavior. Preserve unrelated edits, data, notices, real authorship and timestamps. Verify CI against the published SHA. Current authorization leaves merges and production release for owner review.
