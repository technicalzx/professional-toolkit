# Profile-feedback replacement recovery: observed validation

19 October 2026, Asia/Karachi. Branch `fix/capture-feedback-recovery` started from merged main `cae6594`. Remote verified; pre-existing untracked `.wrangler/` files were preserved. This record separates observed local processing, hosted CI and production release.

## Reproduction and implementation

Actual installed Chrome reproduced the baseline: import a valid synthetic AI report, edit its draft and explicitly request a replacement. Holding the request caused the prior report/draft to disappear before any response; a controlled502 left both absent. This one-off reproduction mocked only account status and the failed review request, without creating an account, contacting a model or inspecting a real profile.

The repair keeps the existing report through a pending/failed replacement and distinguishes previous feedback from a new attempt. It commits a replacement only after successful HTTP and existing report/source-quote validation. Draft/source/request controls lock during processing; synchronous operation ownership prevents same-tick overlaps and rejects a competing extension handoff with an explicit retryable error. Import and saved-report restoration also own their asynchronous operation. Export/copy remain available; editing and private saving unlock after failure. Explicit source/title/URL/request edits still invalidate the old review and reset consent, preserving the original redaction boundary. No persisted schema, migration, dependency or extension permission changed.

## Local checks

- 161/161 application tests and10/10 Python tests passed. The11 focused capture/API checks are a subset, not additional tests. TypeScript, production dependency audit (zero findings) and extension source/ZIP/metadata parity passed.
- Actual five-stage production build passed, followed by the client preview build (1835 modules), nine-file preview packaging and runtime route/asset/ZIP/checksum/guest/404 checks. Existing assertions were retained.
- Actual installed Chrome: desktop1440 and mobile390 both passed the new `scripts/verify-capture-recovery.mjs`. Per viewport:429,502,504, network failure and invalid200 response retained the entire exported edited artifact; a valid200 alone replaced it. Exactly12 explicit intercepted review requests across both viewports, no automatic retries or model calls.
- While pending, original feedback remained visible, draft/source/request/import controls were disabled, JSON export worked and a same-window capture handoff received a retryable busy error. After failure, editing, export and real local private-save/reopen preserved the exact source, prompt, recommendations, timestamp and user-edited draft. Successful replacement cleared the user-edited flag. Subsequent source redaction removed the old result/export and renewed consent.
- One unique synthetic account was created against the real isolated local backend. The harness deleted only that account before PASS and verified its session returned to guest. This is real local persistence with controlled HTTP-response fixtures, not evidence of model quality or vendor-profile acceptance.
- Existing actual loaded-extension capture/account/handoff/private-save/title-sync acceptance and website desktop/mobile download/install/update regressions passed on the rebuilt local backend. A final read-only aggregate found users=0, reports=0, sessions=0 and recovery_codes=0 in this run’s fresh local database.
- Independent app review and root review found no actionable findings. Desktop/mobile failure screenshots were visually inspected; status/error text, retained user edits and recovery buttons fit the viewport. [Desktop failure](assets/capture-recovery-failure-desktop.png), [mobile failure](assets/capture-recovery-failure-mobile.png).

## Runtime evidence and limits

The validation server uses only a fresh local D1 fixture, no AI binding or remote resources. Long Windows persistence paths made Wrangler's local SQLite command fail opaquely; moving this run's state to a shorter owned path initialized the existing11-statement schema successfully. The exact current workerd1.20260918.1 binary at the existing short tools path avoids the native executable path limit; no older runtime substituted. Initial unconfigured runtime invocations hung/crashed; rerunning with that verified binary and serial local application tests passed. These host constraints are not product fixes or CI assertion suppressions.

The manual local fixture uses compatibility date2026-09-25 because that is this pinned workerd's maximum; generated production/Cloudflare Preview configuration remains2026-10-12. Verify actual Cloudflare build and loaded-extension acceptance separately before release claims. The source-level extension package remains0.1.4 with existing permissions and checksum; the receiving website changes do not require a manifest bump.

Beginning-of-run public production `/`, `/capture`, `/extension` and guest `/api/account` checks returned200. Approved live extension remained0.1.3,31,486bytes,SHA256 `08b09aa690432222c1df45a6313bdef42ebccc100da93e17ca48b1e03afeb67a`; traffic remained100% on `f5b88a6f-6720-4b5e-bbbd-077ba097241a`. A bounded30-minute aggregate log query contained two info events and no error-level group; this small indexed sample is not comprehensive uptime/performance evidence. No private bodies, prompts, cookies, queries or saved records were read. Handler timings were not interpreted as CPU or load-test measurements.

Known favicon/prefetch404 observations remain separate; no automatic reload/cache workaround was added. Registry latest braces remains3.0.3; issue #12 is still open and full-tree audit is not claimed clean. Open dependency PRs retain neutral missing-CodeQL-configuration warnings and are not bulk-merged.

## Publication gate and next slice

Publish this complete behavior, browser regression and evidence as a coherent first milestone. A self-contained local backend/Chrome CI runner is being validated as a separate integration milestone so this failure journey stays enforced on later PRs. Record exact commit/check/merge links in the PR after those hosted results exist. No local pass alone establishes Cloudflare or GitHub success.

Future production publishing requires separate owner approval. Current production remains0.1.3; newer source/Preview behavior is not a release. Recovery is in-memory through request failure, not an automatic backup after reload/navigation: users must explicitly export or save. Next practical work is owner evidence from real vendor layouts/feedback quality; the already reproduced favicon and unproven prefetch cause remain bounded operational follow-ups. Do not rebuild the completed capture approval or failed-replacement slices.

## Second milestone: enforce recovery in CI

`scripts/run-capture-recovery.mjs` starts the actual built Worker and assets on a dynamic loopback port, creates a fresh in-memory D1 database and initializes the checked-in schema. It copies no production/Preview database identifiers, account bindings, vars or secrets. There is no AI binding; unexpected Worker outbound requests return a local503. The browser regression intercepts all review POSTs. After success the runner verifies users/reports/sessions/recovery_codes are all zero, and disposes its runtime in `finally`.

The pinned Miniflare5 conversion adapter needs an explicit generated-JavaScript module manifest and assets routing with a user Worker. Earlier automatic discovery and missing-router attempts failed before the final configuration was corrected and actually tested. The test-only compatibility date is explicitly capped at the pinned runtime’s2026-09-25 maximum, with a startup warning whenever it differs from generated Cloudflare configuration; this does not change production code/configuration. Future runtime upgrades must revisit that cap and run the actual acceptance checks.

The complete portable runner passed locally with installed Chrome: all twelve failure/success requests and real local persistence cleanup passed. CI now invokes it after installing its existing isolated Playwright runtime, before the retained project-workflow browser checks. No package, permission or provider was added. Hosted execution on the exact new commit still must pass before merge; local execution is not a claim about Linux CI.

First published milestone: [392e617](https://github.com/technicalzx/professional-toolkit/commit/392e6171be402b72162f3c8249db48d4965cd1de), [PR #15](https://github.com/technicalzx/professional-toolkit/pull/15). All six checks passed on this exact head, including Contributor run39195711031, three CodeQL analyses/summary and Cloudflare build2944dfc9-1aa9-4dbb-9fa6-c4b47afd3212. The second CI-integration milestone must independently pass its final-head checks.

Cloudflare API verified the actual Preview deploymentb230f2d6-74b9-459a-bc22-892bd620544c uses compatibility date2026-10-12, explicitAI/model configuration and separate Preview DB857997b1-ddc7-499a-b4ec-4519b2860437. PreviewURL: https://fix-capture-feedback-recovery-professional-toolkit.abihurairahansari.workers.dev. This supplies the actual platform-date verification that the pinned local runtime cannot provide. A configured AI binding is not a claim that inference was issued in these tests.
