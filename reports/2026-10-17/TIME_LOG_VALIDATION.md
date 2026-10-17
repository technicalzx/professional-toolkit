# Time-log validation - 17 October 2026

## Published implementation and local results

Runtime milestones: [`06ad690`](https://github.com/technicalzx/professional-toolkit/commit/06ad6903ed611a3e0569f1758699cbdac54b7eab) (canonical model, importer, actuals, private storage and regression tests) and [`1f1ff02`](https://github.com/technicalzx/professional-toolkit/commit/1f1ff02a4b0835571344c7a7908e17db6d308df5) (usable import panel, atomic device persistence, exports and CI browser journey). Each was pushed independently to the existing PR #9 branch under the owner's connected identity. No merge or production release was performed.

| Check | Observed result |
| --- | --- |
| `python -m unittest discover -s tests -v` | 6 passed. |
| `node --test "tests/*.test.mjs"` in hosted-app | 119 passed, zero failures/skips after using the configured short workerd path. Includes 13 new domain cases and expanded private-storage/baseline cases. |
| Focused domain regression after review correction | 29 passed. Tasks with no records have unknown variance; JSON, Markdown and summary behavior checked. GitHub CI on `06ad690` also completed successfully with the correction included. |
| `tsc --noEmit --incremental false` | Passed after final UI/null-variance changes. |
| Cloudflare production build | All five Vinext stages passed in isolated `.sites-runtime/tl-20261017` using existing dependencies. No reinstall or package changes. |
| Vite client preview production build | Passed. |
| `preview/pack-worker.mjs` and `preview/check-worker.mjs` | Passed routes, assets, identical extension ZIP bytes, guest API and disabled private writes. |
| `pnpm audit --prod --audit-level=high` | No known vulnerabilities reported. |
| Existing project browser acceptance | Passed brief, evidence gates, delivery/scope changes, work packs, JSON import/export, reload, all audience examples and mobile navigation. Guest mode against full isolated build. |
| Existing evidence browser acceptance | Passed reviewed capture transfer, exact links/provenance, redaction/removal baseline privacy, storage failure, expiry, reload and mobile keyboard flow. Guest mode against full isolated build. |
| New time browser acceptance, full isolated Worker/D1, account mode | Passed mapped import, repeat-ID no-op, changed-ID conflict, invalid dates, atomic local-storage failure with retained draft/data, ID-less duplicate review/default skip/explicit inclusion, hours/minutes/H:mm:ss, spreadsheet-safe CSV, Markdown and JSON, reload, historical-task retention, deletion and 390px keyboard use. |
| New time browser acceptance, client-only CI-equivalent preview | Passed in guest mode after the persistence-wait repair; original assertions retained. No account/database writes. |
| Actual account round trips | Saved five populated records with an empty time baseline, then saved cleared records. The test account deletion returned 200 before PASS. Independent read-only SQLite count found zero synthetic users from all journey fixture display names. |
| User local preview | Restored at `http://127.0.0.1:8790/` from the verified bundle, using the existing account state. Root/capture/account return 200; account response is `no-store`. No synthetic browser flow ran against that owner database. |

Synthetic screenshots were inspected: [desktop time panel](assets/time-actuals.png), [390px time panel](assets/time-mobile.png). Tables scroll within their containers on narrow screens; keyboard checks passed. These are browser checks, not a formal screen-reader or accessibility conformance audit.

## Verification repairs and environment

The initial full Node test invocation hit a native Windows callback assertion in Miniflare-related files because the default workerd executable path is too long in this checkout. The existing short binary path in `MINIFLARE_WORKERD_PATH`, supplied on each command, resolved the runtime issue. Application assertions were not weakened. Local Worker tests and development use compatibility date `2026-05-15`; generated production configuration retains `2026-10-12`.

Review caught negative variance being displayed for tasks with no logs. Those tasks now show unknown variance in summaries, UI and Markdown, with regression coverage. This prevents absent records from looking like measured under-budget work.

The first new browser attempt found an automation locator mismatch for selects wrapped with labels and option text. The controls exposed the correct accessible combobox names. The script now selects those accessible roles; no runtime/UI change was needed. Failed selector attempts created no accounts. Account cleanup uses browser fetch so Secure loopback cookies are sent, and cleanup must pass before the script reports success.

GitHub CI subsequently exposed a browser-test timing race in the client-only preview: the new project was visible before its debounced device save existed, so the initial preview-immutability assertion read an undefined saved record. The test now waits for durable project creation before importing and waits for exact exported project/baseline state before reload. It keeps every original assertion and replaces timing guesses with observable persistence conditions. Guest acceptance against the client-only preview passed in 6.8 seconds after this repair; runtime source and bundle were unchanged.

The isolated test server on 8794 was stopped after acceptance and cleanup. Its synthetic database was separate from the preserved user preview state. No remote database, migration, provider, dependency, billing setting or production resource changed.

## Hosted acceptance and account access boundary

The GitHub-connected Pages check reports successful uploads. For UI milestone `1f1ff02`, it supplied [immutable preview](https://09af1352.professional-toolkit.pages.dev) and [branch preview](https://feature-productive-workspace.professional-toolkit.pages.dev). Chrome navigation to both returned HTTP 404. Anonymous command-line requests varied by client signature: a Mozilla-style client received 404 on root/capture/account, while the default Python client received 403 with `error code: 1010`.

[Cloudflare documents 1010 as a browser-signature access denial](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/). This does not establish the cause of the separate 404. A read-only Pages metadata query through the connected Cloudflare tool was rejected because the hosting account referenced by GitHub is not among the connection's authorized accounts. Correct hosting-account access is needed to inspect configuration/deployment details and diagnose the remote failure. A request to reconnect that account was sent to the owner; no security setting was disabled or bypassed.

Hosted UI/backend acceptance remains blocked/unverified. Deployment success alone is not a working-site claim. The implementation remains reviewable in [PR #9](https://github.com/technicalzx/professional-toolkit/pull/9); final GitHub checks must be read against its exact pushed head separately from these immutable local results. The domain milestone's checks were all successful, including CodeQL with no new alerts. The final completion message records the final-head CI outcome.

## Scope limits and next slice

Generic CSV supports only explicit supplied dates/durations, not direct verified vendor APIs, automatic timestamp conversion, timers, invoices or actual expenditure. Exact project JSON is the lossless backup; spreadsheet-safe CSV may prefix dangerous text and requires current-task mapping on import. Missing logs remain unknown and manual completion is not client approval. Existing 200-entry/200 KB import, 300 KB project and 60 KB account-document limits remain visible/enforced.

[Research and adoption decisions](TIME_LOG_RESEARCH.md) and the [continuous backlog](../../docs/CONTINUOUS_BACKLOG.md) cover the next steps: diagnose hosted previews once the owning account is available, then evaluate shared calendar capacity, verified provider fixtures and cross-project source ownership. Keep merging and production release for owner review.
