# Professional Toolkit delivery roadmap

## Current implementation status — reconciled 17 October 2026

PR #9 implements the connected project workflow, including private revision-checked project envelopes, scope baselines/diffs, manual evidence gates and client/portfolio/handover Markdown packs. These are present in source and tested on the Worker/D1 runtime; they are not future milestones. Reviewed capture snapshots connect to project-scoped sources and exact pinned excerpts, with stale/missing warnings and redaction/deletion across baselines. Mapped CSV time records, duplicate/conflict review, historical-task retention and estimate-versus-recorded-effort feedback are implemented; actual effort remains user-supplied and incomplete logs are not final outcomes. Shared-capacity scenarios now compare current projects alone versus together using explicit numbered-day alignment and availability overrides. Dated calendars and multi-person scheduling remain future work.

Public production deployment, global cross-project sources, semantic AI, verified platform APIs, team approvals and customer validation remain separate. See [current capabilities](../../hosted-app/docs/PRODUCT_WORKSPACE.md) and the [continuous backlog](../../docs/CONTINUOUS_BACKLOG.md) before selecting work. Examples are synthetic and source correspondence does not verify profile ownership or claims.

## Prioritized development backlog

Priorities are product judgments from desk research, not measured customer demand. Each milestone has a concrete acceptance gate; release dates require team capacity and pilot feedback.

| Priority | Milestone | Deliverable | Acceptance gate | Dependency |
| --- | --- | --- | --- | --- |
| P0 | Audience and workflow foundation | Current directory, planner, evidence references, scenarios and portable snapshots | Deterministic engine checks; type/build validation; manual UX review recorded separately | Existing app |
| P0 | Production boundary | Auth CPU verification, importer egress, staging persistence and user isolation | Disposable-account registration/recovery/report tests on intended runtime and plan; controlled egress test | Hosting and plan decision |
| P1 | Project envelopes — implemented | Private bounded project/baseline records, source revisions, JSON restore and deletion | Ownership, optimistic conflicts and Worker/D1 round trips tested; full relational revision history remains future | Existing report storage |
| P1 | Scope change impact — implemented | Stable-ID comparison and downstream task/deliverable impact | Added/removed/changed requirements, estimates and dependency propagation tested | Project envelopes |
| P1 | Student evidence portfolio — implemented bounded slice | Recorded project pack with exact source excerpts and provenance | Client/portfolio/handover reuse and missing/stale references tested; no verified skill claims | Project sources |
| P1 | Professional handover — implemented bounded slice | Project scope, task progress, manual checks and pinned excerpts | Export and account ownership tested; formal decision approval history remains future | Project records |
| P1 | Research pilot | 15 discovery participants and paired workflow trials | Report observed outcomes and competing solutions; go/no-go gates in research | Usable prototype and consent |
| P2 | Structured AI extraction | Brief/course/role text to proposed requirements with citations | Fixed evaluation set; abstention and prompt-injection checks; provider failure handling | Consent, usage caps and reviewed provider |
| P2 | Cross-project capacity — implemented bounded slice | Selected projects share explicit numbered-day availability | Solo/shared conflict comparison, overrides, reference freshness and exports; calendar/timezone model remains future | Existing canonical projects and private configuration snapshots |
| P2 | Recorded effort - implemented bounded slice | Generic mapped CSV time logs, historical tasks and current-estimate comparison | Repeat-ID no-op, possible-duplicate review, atomic conflicts, strict supplied dates and exports tested; external client approval/billing remain future | Existing project envelopes |
| P2 | Career pack | Resume/case-study/application drafts from approved evidence | Every experience claim cites a user-approved artifact; editable/exportable outputs | Evidence and document export |
| P3 | Team collaboration | Roles, assignments, approval history and conflict-safe edits | Membership revocation tests; no stale-approval execution | Workspace model |
| P3 | Sustainability | Sponsors documentation, hosted offer and support | Verified eligibility, cost per retained user and transparent terms | Demand and operating evidence |

## Tool taxonomy for expansion

Status vocabulary: **existing** means present at the baseline; **new** means code in this branch; **planned** means not implemented. A future tool appears in documentation, not as an inert “working” button.

| Audience / subcategory | Tool | Status | Execution / dependency |
| --- | --- | --- | --- |
| Freelancers / Profile & evidence | Content/profile audit | Existing | Local deterministic rubric |
| Freelancers / Opportunities | Brief matcher | Existing | Literal comparison; no semantic claim |
| Freelancers / Client acquisition | Proposal outline | Existing | Editable template, not AI |
| Freelancers / Business planning | Hourly rate and project estimate | Existing | User assumptions |
| Freelancers / Delivery planning | Dependency and evidence planner | New | Browser kernel; optional existing report API |
| Freelancers / Delivery planning | Scope-change impact | Implemented in PR #9 | Stable IDs and revision comparison |
| Freelancers / Delivery planning | Acceptance and handover pack | Implemented in PR #9 | Manual evidence and pinned source excerpts |
| Freelancers / Business planning | Estimate-to-recorded-effort review | Implemented in PR #9 | Mapped generic CSV; supplied dates, external IDs and duplicate review |
| Freelancers / Client acquisition | Opportunity pipeline and follow-up drafts | Planned | Projects; any sending requires explicit user action |
| Students / Academic progress | GPA and marks percentage | Existing | Institution/user inputs |
| Students / Opportunities | Brief/role matcher | Existing | Literal comparison |
| Students / Project evidence | Project and research planner | New | Shared kernel with student example |
| Students / Learning & research | Prerequisite learning path | Planned | Reviewed skill/learning graph |
| Students / Learning & research | Project source excerpts | Implemented bounded slice | Reviewed snapshots; no citation-service adapter |
| Students / Project evidence | Recorded project portfolio pack | Implemented bounded slice | Project records and exact source excerpts; reproducibility is user-supplied |
| Students / Opportunities | Application evidence pack | Planned | Approved claims and document templates |
| Professionals / Career evidence | Profile/content audit | Existing | Local deterministic rubric |
| Professionals / Delivery planning | Estimate and dependency planner | Existing estimate; new planner | Shared kernel |
| Professionals / Collaboration | Decision log and handover | Planned | Revisions and reviewed evidence |
| Professionals / Skills development | Skill-gap experiment planner | Planned | Requirements and demonstrated artifacts |
| Professionals / Career evidence | Review/promotion evidence pack | Planned | Approved and appropriately redacted work records |
| Professionals / Delivery planning | Cross-project capacity planner | Implemented bounded slice | Explicit aligned abstract days; personal capacity and overrides; calendar integration remains planned |
| Shared / Utilities | Search, favorites, saved reports, copy/export | Existing; expanded for workflows | Browser and existing accounts |
| Shared / Intelligence | Structured extraction and evidence retrieval | Planned | Opt-in provider with evaluation and budgets |
| Shared / Integrations | Calendar and time tracking | Planned | Verified API scope and authorization |
| Shared / Utilities | PDF/OCR/image tools | Planned, lower priority | Safe file processing and resource limits |

## Contributor-ready tasks

1. Add a `PlanInput` fixture with a diamond dependency graph and conflicting deadlines; independently verify expected ordering and visible assumptions.
2. Conduct keyboard and screen-reader review of `/workflows`, including add/remove rows, error recovery, horizontal table overflow and file import.
3. Propose source and evidence JSON schemas with versioned export fixtures. Do not store actual client documents in test data.
4. Extend source-grounding regressions with multilingual excerpts and stale/missing references; preserve the implemented scope-diff contract.
5. Prototype a time-log CSV adapter in isolation, with duplicate row handling and explicit time-zone provenance.

Follow the existing contribution policy. Keep change sets reviewable, preserve third-party notices and document failed checks. Do not turn an empty field into a fabricated claim or a heuristic output into a guaranteed outcome.
