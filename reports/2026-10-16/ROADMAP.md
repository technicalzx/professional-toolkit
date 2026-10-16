# Professional Toolkit delivery roadmap

## Current development milestone

The repository now contains three audience choices, subcategory filtering and a connected workflow planner. Users can create requirements with evidence notes, define dependent tasks, compare deadlines and capacity under a higher-effort scenario, save locally or to an existing account, reopen snapshots and import/export JSON. Examples are explicitly synthetic and load only on request. This is the first working slice of the research direction, not the complete platform.

The kernel rejects cycles, missing references, invalid numbers and oversized inputs. Its limitations are visible in the UI. The existing tools remain available. No fake AI response, live integration or performance statistic is introduced.

## Prioritized development backlog

Priorities are product judgments from desk research, not measured customer demand. Each milestone has a concrete acceptance gate; release dates require team capacity and pilot feedback.

| Priority | Milestone | Deliverable | Acceptance gate | Dependency |
| --- | --- | --- | --- | --- |
| P0 | Audience and workflow foundation | Current directory, planner, evidence references, scenarios and portable snapshots | Deterministic engine checks; type/build validation; manual UX review recorded separately | Existing app |
| P0 | Production boundary | Auth CPU verification, importer egress, staging persistence and user isolation | Disposable-account registration/recovery/report tests on intended runtime and plan; controlled egress test | Hosting and plan decision |
| P1 | Versioned projects | Workspace, project, source and requirement records; plan revisions | Cross-tenant denials; optimistic conflict handling; migration/restore exercise; export/deletion | Persistence schema and ownership model |
| P1 | Scope change impact | Compare confirmed requirement revisions; show affected tasks, evidence and schedule | Change a requirement and trace every affected dependency; unchanged tasks stay stable | Versioned projects |
| P1 | Student evidence portfolio | Source-linked learning/project artifacts and truthful skill claims | Produce a case study with inspectable source links and explicit missing evidence | Versioned sources |
| P1 | Professional handover | Decisions, validation checklist and reviewed artifact pack | Handover pack links to exact source and plan versions; revocation blocks private export | Projects and artifacts |
| P1 | Research pilot | 15 discovery participants and paired workflow trials | Report observed outcomes and competing solutions; go/no-go gates in research | Usable prototype and consent |
| P2 | Structured AI extraction | Brief/course/role text to proposed requirements with citations | Fixed evaluation set; abstention and prompt-injection checks; provider failure handling | Consent, usage caps and reviewed provider |
| P2 | Cross-project capacity | Several projects share one person's calendar and availability | Detect conflicting commitments; test time zones and time off; show heuristic limits | Calendar model and pilot need |
| P2 | Actual outcomes | Import time logs and record accepted deliverables | Idempotent import; estimate/actual comparisons with provenance | Authorized adapter |
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
| Freelancers / Delivery planning | Scope-change impact | Planned | Revision graph |
| Freelancers / Delivery planning | Acceptance and handover pack | Planned | Source/artifact model |
| Freelancers / Business planning | Estimate-to-actual review | Planned | Entered or authorized time records |
| Freelancers / Client acquisition | Opportunity pipeline and follow-up drafts | Planned | Projects; any sending requires explicit user action |
| Students / Academic progress | GPA and marks percentage | Existing | Institution/user inputs |
| Students / Opportunities | Brief/role matcher | Existing | Literal comparison |
| Students / Project evidence | Project and research planner | New | Shared kernel with student example |
| Students / Learning & research | Prerequisite learning path | Planned | Reviewed skill/learning graph |
| Students / Learning & research | Source-linked research notes | Planned | Citation/source adapters |
| Students / Project evidence | Reproducible portfolio pack | Planned | Artifact references and claims |
| Students / Opportunities | Application evidence pack | Planned | Approved claims and document templates |
| Professionals / Career evidence | Profile/content audit | Existing | Local deterministic rubric |
| Professionals / Delivery planning | Estimate and dependency planner | Existing estimate; new planner | Shared kernel |
| Professionals / Collaboration | Decision log and handover | Planned | Revisions and reviewed evidence |
| Professionals / Skills development | Skill-gap experiment planner | Planned | Requirements and demonstrated artifacts |
| Professionals / Career evidence | Review/promotion evidence pack | Planned | Approved and appropriately redacted work records |
| Professionals / Delivery planning | Cross-project capacity planner | Planned | Working calendar and conflict model |
| Shared / Utilities | Search, favorites, saved reports, copy/export | Existing; expanded for workflows | Browser and existing accounts |
| Shared / Intelligence | Structured extraction and evidence retrieval | Planned | Opt-in provider with evaluation and budgets |
| Shared / Integrations | Calendar and time tracking | Planned | Verified API scope and authorization |
| Shared / Utilities | PDF/OCR/image tools | Planned, lower priority | Safe file processing and resource limits |

## Contributor-ready tasks

1. Add a `PlanInput` fixture with a diamond dependency graph and conflicting deadlines; independently verify expected ordering and visible assumptions.
2. Conduct keyboard and screen-reader review of `/workflows`, including add/remove rows, error recovery, horizontal table overflow and file import.
3. Propose source and evidence JSON schemas with versioned export fixtures. Do not store actual client documents in test data.
4. Design the scope-diff contract against two synthetic requirement revisions, including removed requirements and orphaned tasks.
5. Prototype a time-log CSV adapter in isolation, with duplicate row handling and explicit time-zone provenance.

Follow the existing contribution policy. Keep change sets reviewable, preserve third-party notices and document failed checks. Do not turn an empty field into a fabricated claim or a heuristic output into a guaranteed outcome.
