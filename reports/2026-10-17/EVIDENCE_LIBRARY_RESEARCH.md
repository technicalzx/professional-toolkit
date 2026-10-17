# Project evidence library: research and decision

Research date: 17 October 2026, Asia/Karachi. Baseline: `88833ed`, PR #9 open with successful CI. This run continues its branch rather than duplicating the project workflow.

## Observations

The baseline can capture a loaded page and separately collect manual project evidence notes. It cannot attach a reviewed snapshot and selected excerpt to several work items. Carrying context between capture, planning and output screens is an observed product gap, not a claim about every competitor.

| Primary source | Observed architecture and license | Adaptation |
| --- | --- | --- |
| [Zotero](https://github.com/zotero/zotero), [Web API](https://www.zotero.org/support/dev/web_api/v3/basics), [sync model](https://www.zotero.org/support/dev/web_api/v3/syncing) | Identified library items, structured source records and version-aware synchronization. [Source license: AGPLv3](https://raw.githubusercontent.com/zotero/zotero/main/COPYING). | Separate a source from references using it; pin excerpts to a revision. No Zotero code, API integration or dependency is included. |
| [Reactive Resume](https://github.com/reactive-resume/reactive-resume), [license](https://raw.githubusercontent.com/reactive-resume/reactive-resume/main/LICENSE) | Structured documents, portable JSON and multiple export formats. MIT licensed. | One canonical project record drives editable JSON and client, portfolio and handover Markdown. No upstream code or templates are copied. |
| [W3C PROV overview](https://www.w3.org/TR/prov-overview/) | Distinguishes described objects, processing and associated actors; versioning and derivation preserve context. Standards reference, not a code dependency. | Record locator, capture method/time, user edits and pinned revision. Exact text correspondence remains distinct from verification. No PROV serialization or conformance is claimed. |

## Product hypothesis

Keeping a reviewed source once, linking excerpts to several work items, and reusing those references in outputs should reduce repeated copying and expose missing support. This is a desk-research judgment. Customer time savings, conversion gains, funding readiness and worldwide novelty are unmeasured.

## Architecture decision

`lib/projects/evidence.mjs` normalizes bounded sources and interprets references. The existing engine owns mutation and export operations. Requirements and deliverables store source ID, revision and an exact quote. A shared project type documents canonical output.

`lib/projects/workspace-evidence.mjs` reconciles the baseline with current source content at import, device and API boundaries. A scope baseline cannot become a hidden archive of removed text. Existing account ownership, compare-and-swap revisions, quotas and the 60 KB envelope bound apply. No table, Cloudflare resource or runtime dependency is added.

The UI imports source/review JSON, links excerpts, edits/redacts source revisions, removes content and displays repairable warnings. Capture transfers reviewed content to a selected project in the same tab without account or AI access. Drafts expire after 15 minutes and are cleared. Source mutations persist on the device before success is reported; account updates remain explicit.

## Boundaries

- Sources are project-scoped. Global reuse needs a separate ownership and deletion model.
- Only the latest snapshot is retained. Revision changes clear old linked quotes, including in the scope baseline. Removal leaves bounded empty references for missing-source warnings.
- Markdown includes matched selected excerpts and provenance, not the raw corpus. Project JSON and account saves include source content. Independent notes, downloads and other copies are outside source deletion.
- Limits: 12 sources, eight links per requirement/deliverable, 600 characters per excerpt, existing 300 KB project and 60 KB account-envelope bounds.
- Legacy version-1 records remain readable. An older client cannot overwrite stored evidence simply by omitting unsupported source fields.
- No AI or semantic matcher is used for exact text correspondence. Direct crawling, ownership verification and truth verification remain outside this feature.

## Validation and next decision

See [run validation](EVIDENCE_LIBRARY_VALIDATION.md) for final observed results. Tests use synthetic data; live platform layouts and customer usefulness still need owner/pilot acceptance.

Next candidate: time-log CSV import with deduplication, explicit mapping feedback and estimate-versus-actual analysis inside the same project context.
