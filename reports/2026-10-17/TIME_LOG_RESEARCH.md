# Time logs connected to delivery scope - 17 October 2026

## Observed problem and existing evidence

PR #9 is open on `feature/productive-workspace`; the run began at `83df770`, with its existing checks successful. The app already connects projects, scope baselines, reviewed sources and work packs. Its delivery plan totals estimated effort and the estimates of unfinished tasks, but has no recorded actual effort. Users who track work in another tool or a spreadsheet must reconcile it manually against scope. This is an interoperability hypothesis supported by the import workflows below; customer demand, willingness to pay and funding outcomes have not been measured.

This extends the next slice in [the continuous backlog](../../docs/CONTINUOUS_BACKLOG.md), rather than rebuilding the source library. The target and investigation goal were supplied in the scheduled request; this is ordinary source development, not shipped-artifact reverse engineering.

## Relevant primary sources and decisions

| Source | Observations and license | Decision for this app |
| --- | --- | --- |
| [Solidtime import documentation](https://docs.solidtime.io/user-guide/import), [repository](https://github.com/solidtime-io/solidtime), [manifest](https://github.com/solidtime-io/solidtime/blob/main/composer.json), [license](https://github.com/solidtime-io/solidtime/blob/main/LICENSE.md) | Generic UTF-8/comma CSV documents separate project and time-entry entities. Estimates use seconds; entries carry project/task, descriptions and explicit UTC timestamps. The documentation recommends importing projects first. PHP/Laravel application; manifest declares AGPL-3.0-or-later. | **Adapt** explicit units and entity mapping. Import into an existing project and explicitly map current tasks, so imported activity cannot create unexplained scope. **Defer** the PHP stack and all upstream code reuse. This generic importer does not claim direct Solidtime-export compatibility. |
| [Kimai importer documentation](https://www.kimai.org/documentation/plugin-import.html), [repository](https://github.com/kimai/kimai), [manifest](https://github.com/kimai/kimai/blob/main/composer.json), [core license](https://github.com/kimai/kimai/blob/main/LICENSE) | The importer documents duration, project/activity and description fields. It warns that user timezone and vendor date formats affect interpretation. Core is PHP/Symfony and declares AGPL-3.0-or-later; that does not establish the separate import plugin's license. Duplicate-import behavior was not established by the reviewed page. | **Adapt** explicit date/unit choices and actionable row errors. **Defer** vendor-specific timestamp adapters, automatic timezone conversion and upstream plugin reuse. Support strict supplied `YYYY-MM-DD` work dates plus duration first. |
| [Papa Parse documentation](https://www.papaparse.com/docs), [repository](https://github.com/mholt/PapaParse), [manifest](https://github.com/mholt/PapaParse/blob/master/package.json), [MIT license](https://github.com/mholt/PapaParse/blob/master/LICENSE) | Documents quoted/multiline CSV, parsing errors and formula escaping on output. Its manifest has no runtime dependencies. It supports more dialects and environments than this slice requires. | **Defer dependency adoption** for this bounded comma-only adapter; independently implement the required subset with fixtures for quoting, BOM, multiline fields, duplicate headers, malformed input and limits. Revisit a pinned audited parser if measured interoperability failures justify the maintenance/bundle tradeoff. No Papa Parse code is copied, and its full format support is not claimed. |

All three repositories are references, not incorporated code. No new runtime dependency, provider, database, billing service or license change is needed. Licenses were checked at research time; future reuse requires checking the exact revision and obligations again.

## Priority decision

| Candidate | User value hypothesis | Effort and fit | Decision |
| --- | --- | --- | --- |
| Time-log CSV reconciliation and scope-linked actuals | Removes repeated copying and exposes where recorded effort exceeds an estimate | Bounded adapter plus the existing canonical project, private save and exports | **Implement this slice** |
| Cross-project calendar conflicts | Exposes commitments hidden by single-project feasibility | Requires calendar dates, availability and timezone ownership absent from abstract working-day plans | **Next research candidate**, after actuals are complete |
| Global shared evidence sources | Reduces repeated imports across projects | Needs ownership, revision propagation and deletion rules across references | **Defer**; project-local sources already work |

These are qualitative implementation priorities, not measured market scores.

## Architecture and acceptance

- Pure CSV parser -> explicit column and current-task mapping -> row preview -> deterministic reconciliation -> existing canonical project validation -> synchronous device save -> explicit private account save.
- Store bounded integer seconds, supplied work date, stable source namespace, optional external ID, historical task ID/title, optional note and import timestamp. Do not retain the complete CSV file. Preserve JSON data; omit raw descriptions from general Markdown work packs.
- Same source namespace/external ID plus unchanged content is a duplicate. Changed content under that identity is a conflict. Rows without IDs can be indistinguishable legitimate sessions: show possible duplicates and require explicit inclusion to import those additional sessions. A renamed CSV file is not a new identity.
- Keep logs when scope changes remove tasks, and report the unmatched historical effort separately. Logs do not mark tasks done, establish approval, or replace estimates of unfinished work.
- Scope baselines contain no time records. Normalize legacy/imported baselines on device and API read/write. Reject older-client updates omitting time fields when the saved project contains time logs.
- Preserve the existing 300 KB project, 60 KB account-document, private-owner, quota and compare-and-swap boundaries. A persistence or validation failure must retain the prior project and import draft.
- Compare estimates and recorded effort so far, with coverage and incompleteness explicit. Do not infer final actual expenditure, invoice amounts, productivity rankings or schedule feasibility from partial logs. Work dates are supplied records with no timezone conversion; the planner still uses abstract working days.
- Provide a usable desktop/mobile time panel, per-row errors, repeat-import handling, deletion and portable exports. Formula-neutralize spreadsheet CSV text; keep exact machine data in JSON.

Verification and observed implementation results are recorded separately in `TIME_LOG_VALIDATION.md`. Natural delivery milestones are domain/storage behavior with tests, the usable import/export interface with browser regression, and final research/validation/backlog reconciliation. Each is pushed when independently ready; there is no commit quota.
