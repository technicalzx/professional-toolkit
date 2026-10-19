# Recover profile feedback after a failed replacement

Research and decision: 19 October 2026, Asia/Karachi. Base `cae65942dcfa9a5dba0dc536a133ed751a0889b0`, verified remote `https://github.com/technicalzx/professional-toolkit.git`. PRs #9, #11, #13 and #14 are merged; their source-to-project, time import, capacity, capture approval and pipeline slices must not be rebuilt.

## Observed problem and boundaries

`Capture.reviewAI()` clears the existing report before validating or receiving a replacement. A person who imports/opens an AI review, edits its rewrite and explicitly retries the same request can lose that unsaved work on a rate-limit, network, server or invalid-response failure. The source editors are already disabled during processing, but the generated-draft editor remains writable. Asynchronous extension delivery and saved-review/file loading also need to respect pending work. Browser reproduction and its exact outcomes are recorded separately in FEEDBACK_RECOVERY_VALIDATION.md.

Keep the existing redaction boundary: changing source URL, title, body or request intentionally invalidates the old report. Retaining its hidden original source after visible redaction would be unsafe. This slice preserves the existing report through a replacement attempt on the same reviewed input; it does not add an invisible archive, provider, automatic retry or unbounded request loop. Successful validated replacement and an explicit new local review/import can replace the result. Exports and private saves after failure must preserve the original report and user edits, not mislabel them as newly generated feedback.

## Primary research and adoption

| Source | Relevant architecture and user journey | Decision / license and maintenance |
| --- | --- | --- |
| [React effect fetching guidance](https://react.dev/reference/react/useEffect#fetching-data-with-effects) | Asynchronous results can arrive after the requesting UI has changed; cleanup and current-operation checks prevent obsolete data from overwriting current work. | Adapt the existing component's operation ownership and cleanup. Existing React dependency; upstream implementation MIT, documentation CC BY 4.0. No third-party source copied and no new package. Test actual overlap/unmount flows rather than relying on fetch order. |
| [React useRef](https://react.dev/reference/react/useRef) | A ref can hold operation ownership synchronously across event handlers while rendered state drives busy UI. This closes same-tick gaps before a disabled control rerenders. | Adapt a small synchronous operation guard, paired with rendered busy state; do not store private data globally or make ref changes during render. Same existing dependency/license concerns. Avoid a second persistence system for a transient UI operation. |
| [MDN Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok) | A fulfilled fetch promise is not necessarily a successful HTTP response. A successful status also does not validate a report body. | Adopt separate HTTP and existing captured-review validation before committing replacement. MDN documentation CC BY-SA 2.5 or later; no text/code copied. Preserve existing source-quote validation and fail honestly on malformed output. |

The research compares a concrete existing user journey with authoritative platform patterns, rather than importing a repository or adding a new framework to solve a small state-recovery failure. Prior Chrome activeTab, optional-origin consent and evidence-capture findings remain applicable and unchanged; see CAPTURE_APPROVAL_RESEARCH.md.

## Ranked decisions

1. **Failed replacement recovery — high practical value, bounded effort, strong fit.** Preserve paid/generated work and the user's draft while reusing the current Worker/D1 report contract. Include real editor state, errors, export and private-save recovery, plus browser acceptance with controlled synthetic responses. No model call is needed to test a client error path.
2. **Missing favicon — small effort, smaller direct workflow value.** Still reproduced as a default request404; defer while draft loss is actionable. Do not add reload/cache workarounds for the unresolved prefetch cause.
3. **Dependency updates — separate maintenance decision.** Existing development-only braces advisory has no patched release at this check (registry latest3.0.3); keep issue #12 and audit policy. Old dependency PRs need actual security analyses after branch refresh, not a neutral-check waiver. Do not bundle unrelated upgrades into this repair.

## Commit boundaries and release

Publish the complete component recovery behavior together with focused tests and the actual browser regression after local checks. A separately useful CI acceptance integration can follow once the new regression is proven and its isolated backend setup is verified. Keep meaningful history; do not split cosmetic edits to create contributions. Recheck exact-head CI and review before a merge commit.

The extension package remains0.1.4 because this slice changes the receiving website's recovery behavior, not the extension's behavior, permissions or shared snapshot schema. Reverify source/package parity, actual loaded-extension handoff, installation links and desktop/mobile downloads. Production remains the approved0.1.3 until a separately authorized release. Preserve additive-data and privacy requirements; no database migration is needed.
