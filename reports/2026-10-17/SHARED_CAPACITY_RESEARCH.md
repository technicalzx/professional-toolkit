# Shared capacity: research and implementation decision

17 October 2026. Starting source: PR #9 at `37f160e`. Existing projects already connect requirements, accepted scope, dependency tasks, approved source excerpts and imported time logs. This slice addresses a remaining planning gap: projects can each fit one person's hours when checked alone while their combined commitments conflict.

## Sources and architecture decisions

| Primary source | License / maintenance concerns | Relevant pattern and decision |
| --- | --- | --- |
| [OpenProject](https://github.com/opf/openproject), [schedule and availability](https://www.openproject.org/docs/user-guide/account-settings/schedule-and-availability/), [work-package dates](https://www.openproject.org/docs/user-guide/work-packages/set-change-dates/) | [GPLv3](https://github.com/opf/openproject/blob/dev/LICENSE), with separate [copyright notices](https://github.com/opf/openproject/blob/dev/COPYRIGHT). Adopting its application stack or source would add substantial runtime and license obligations. | **Adapt the separation** of personal availability, time off and project scope. Use one shared availability budget plus explicit daily adjustments. Keep exploratory changes separate from accepted commitments. No code copied; defer stack adoption. |
| [TC39 PlainDate](https://tc39.es/proposal-temporal/docs/plaindate.html), [Temporal polyfill](https://github.com/js-temporal/temporal-polyfill) | Polyfill [ISC license](https://github.com/js-temporal/temporal-polyfill/blob/main/LICENSE), with its own dependency/runtime surface, including JSBI. Native support cannot be assumed across browsers and Worker runtimes. | **Adopt the semantic distinction** between dates and instants; **defer calendar support and the dependency**. Existing task deadlines are ordinal project days. Explicitly align each project day 1 to a shared numbered day. No inferred timezone, weekday, holiday or current date. |
| [Timefold Solver](https://github.com/TimefoldAI/timefold-solver), [official quickstart](https://docs.timefold.ai/timefold-solver/latest/quickstart/hello-world/hello-world-quickstart) | [Apache 2.0](https://github.com/TimefoldAI/timefold-solver/blob/main/LICENSE.txt). Java/Kotlin, JDK and Maven stack does not fit a small existing JavaScript Worker without a separate service. | **Adapt explicit constraints and explanations**, separating availability/dependency constraints from preferences. **Defer the solver/runtime**. A deterministic bounded heuristic reports observed conflicts and cumulative demand pressure; never claim an optimal schedule or general feasibility proof. |

The sources support architecture patterns, not measured demand, uniqueness or funding prospects. No third-party code or new dependency is incorporated in this slice, so no copied-code notices are required. Revisit upstream maintenance and licenses before future reuse.

## Priority comparison

| Candidate | Practical value | Effort and fit | Decision |
| --- | --- | --- | --- |
| Compare selected projects against one person's hours; show alone versus together | Directly exposes overcommitment hidden by independent project checks | Moderate; reuses canonical projects, browser storage and private report snapshots | **Implement now** with explicit start alignment, availability adjustments, explanation and export |
| Calendar dates, weekends, holidays and timezone-aware imports | Useful for real dated commitments, but premature without a clear mapping from existing ordinal deadlines | Higher; requires explicit workweek, release/deadline and timezone semantics | **Defer**; never silently move a deadline when time off is added |
| Multi-person assignment and optimum scheduling | Potential future team use; not evidenced by current one-person records | High; new ownership, resource and solver models | **Defer** pending validated workflows |
| Direct time-source connectors | Reduces manual importing for a specific provider | Requires verified synthetic exports, stable IDs and timezone/correction semantics | Keep next backlog; existing generic mapped CSV remains available |

Ranks are qualitative engineering judgments, not market survey scores.

## Bounded product contract

A versioned `capacity-scenario` stores only availability, selected project IDs, their explicit shared start days and last-reviewed project update timestamps. It does not duplicate evidence, task text or time logs. Save at most five local scenarios; account copies are private immutable snapshots under the existing report quota. Missing referenced projects block analysis and direct the user to load account copies or remove a selection. Changed references warn; calculations always use the current validated records. JSON imports are bounded and validated before replacing local state.

The independent aggregate engine supports the existing 20-project / 40-task bounds (800 tasks) without relaxing the 50-task single-planner contract. One person shares 1–90 numbered days, 0–24 supplied hours per day, with explicit overrides including zero-hour days. Entire selected project horizons must fit. Completed tasks satisfy prerequisites; open/in-progress tasks retain their supplied full estimates. Logged time is never silently subtracted from remaining work.

Ready work is ordered by downstream deadline, own deadline and stable project/task identifiers, reconsidered at day boundaries and task completion. Dependencies must complete before dependent work is allocated. Solo and shared comparisons use the same release and availability assumptions. Positive cumulative demand above capacity explains a necessary capacity deficit; zero pressure alone does not establish feasibility. The schedule is a deterministic heuristic, not an optimizer.

All analysis and Markdown exports recompute from current sources. Markdown omits source/evidence/time corpora and availability reasons; configuration JSON contains reviewed reasons and project references. Titles and identifiers remain user-supplied information to review before sharing. No account migration, new provider, calendar inference or production deployment is needed for this feature.

## Verification plan

Exercise conflicts invisible in solo planning, task-ID collisions, dependencies, future releases, daily reprioritization, zero/fractional availability, all 800 tasks, stale/missing references, input immutability and inert exports. Verify device-write failures before success, account ownership/quota/snapshot cleanup, desktop/mobile interactions and unchanged project data. Record actual results separately in `SHARED_CAPACITY_VALIDATION.md`; this plan is not evidence that checks passed.
