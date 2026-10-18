# Live Cloudflare deployment

Verified 18 October 2026 (Asia/Karachi). [Open the app](https://professional-toolkit.abihurairahansari.workers.dev) · [Capture and review](https://professional-toolkit.abihurairahansari.workers.dev/capture) · [Chrome extension setup and updates](https://professional-toolkit.abihurairahansari.workers.dev/extension) · [Extension ZIP](https://professional-toolkit.abihurairahansari.workers.dev/toolkit-capture-extension.zip).

Latest release: extension 0.1.3 and the discoverable download/install/update journey are live, with exact download bytes, SHA-256 metadata and desktop/mobile browser acceptance verified. The loaded extension passed synthetic capture, account connection, private saving and saved-title sync again; its disposable account was deleted before PASS. See [release evidence and local verification repairs](../../reports/2026-10-18/EXTENSION_DISTRIBUTION.md). The existing database and configured AI model remain in place; this slice made no new inference requests.

The full Worker backend runs in the owner's account, separate from the older guest-only Pages preview. Exact public resource IDs, source revision, deployed version and ZIP digest are in [live.json](live.json). Both connected Cloudflare MCP providers now reach this hosting account, including Workers Builds configuration and sanitized build-log access. Wrangler OAuth remains available for deployment operations; its earlier CI 403 does not describe the current MCP access. No subscription, paid upgrade, AI credits, DNS record or existing production database was changed. The production database was initialized empty during the original deployment. The later build repair created and initialized a separate Preview database from the existing schema; see [Worker Previews repair and acceptance](../../reports/2026-10-18/WORKERS_BUILDS_REPAIR.md). Local preview users are not automatically migrated; create a live account and explicitly import/export records you wish to move.

## Chrome setup

1. Download and extract the ZIP above.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the extracted folder containing `manifest.json`.
3. Open the live app and create/sign into an account. Extension 0.1.3 defaults to this live origin; existing installations can retain a prior saved origin, so replace it with the URL above if necessary. For an update, replace files in the same extension folder and click **Reload** in Chrome; unpacked installs do not update automatically.
4. In the extension, click **Connect account** and grant access to that exact toolkit origin. On your source profile, expand the sections you want included, open the extension and choose **Capture this page**.
5. Review/redact the captured text, enter your request, confirm transfer and select **Open profile feedback**. On the website allow Cloudflare AI processing and click **Get AI profile feedback**. Review/edit the generated draft and explicitly save privately. **Sync saved review titles** reopens your account's reviews.

This is a developer/unpacked extension, not a Chrome Web Store listing. It reads loaded page text after your click and does not fetch private profiles from a bare URL. Real authenticated LinkedIn, Fiverr and Upwork profile acceptance must be performed by the owner. The automated fixture uses a synthetic rendered LinkedIn page, not a real account or a provider API. Cloudflare AI is configured for consented, signed-in profile feedback. The shared launch limit is 20 attempts per UTC day. See [real-inference evidence and limits](../../reports/2026-10-18/PROFILE_FEEDBACK.md).

## Observed verification

- 145 application unit/integration tests pass; TypeScript, production dependency audit and all five production build stages pass. Extension-only follow-up checks: nine passed after the default-origin/version change. Deployment dry run passed; initial startup 15ms, final startup 10ms (startup is not per-request CPU time).
- Live Chrome project, evidence/capture and time-log guest regressions pass. Live capacity regression passes with account registration, private project/scenario saves, reload, failed-device-storage recovery and mobile keyboard checks.
- Actual loaded Chrome extension: account connection, activeTab capture, packaged handoff to the live website, private save and saved-title sync all pass. The final live ZIP matches the tested release package byte for byte. Runtime host permission is pre-granted only in a temporary test manifest; actual owner permission prompts remain manual acceptance.
- Each live synthetic account is deleted before PASS. A separate read-only remote count found users=0, reports=0 and sessions=0 after testing. No real profile records or credentials are stored in these reports.
- Final deployed version is recorded in live.json. PR #9 and the merge-rule update #10 have since merged. Extension distribution is reviewed in PR #11, with independently useful packaging and website commits; CI and merge status are checked separately against the exact final pushed SHA. The owner now permits reviewed, passing PR merges that preserve individual commits; future production releases retain their separate authorization boundary.

## Logs and performance

[Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) is enabled. Structured events contain only request ID, allowlisted route/method, response status and elapsed handler time. Automatic invocation logging is disabled to avoid persisting full URLs; no request bodies, query strings, cookies, profile text, prompts or exception messages are emitted by application logging. Responses include `X-Request-ID` and `Server-Timing: app`; handler timing is wall time, not CPU time or a full browser performance score. Platform clock resolution can produce zero for fast non-I/O responses.

Use `wrangler tail professional-toolkit --format pretty` in the authenticated hosting account for bounded live diagnosis. Do not commit raw tails, inspect real saved reports or retain user content. The existing five-hour automation now checks the live target and sanitized operational errors; it is scheduled monitoring, not continuous observation. Keep the computer and desktop app available for local scheduled work.

Observed synthetic traffic completed without API 5xx. Account creation took approximately 2317ms handler wall time; account/report reads were roughly 589–908ms and writes around 918–1223ms during this sample. D1 was created in EEUR and requests involved network waits. These are a small observed sample, not percentile, CPU, cost or load-test claims. Follow up with request-volume/region evidence before changing database placement, caching private responses or changing password security. Billing/subscription reads remain unavailable; no claim of unlimited or verified Free-plan capacity is made.

The tail also showed 404 requests for a default favicon and a generated workflow prefetch chunk while functional journeys passed. Reproduce the prefetch path under a stable deployment and review framework asset retention before any repair. Do not suppress errors or call this zero-error hosting.

## Reproduce and roll back

Use the pinned runtime/dependencies. Set `CLOUDFLARE_ACCOUNT_ID`, `TOOLKIT_DATABASE_ID` from live.json, `TOOLKIT_DEPLOY_TARGET=cloudflare` and `TOOLKIT_AI_MODEL=@cf/meta/llama-3.1-8b-instruct-fp8-fast`, then build with `node scripts/run-framework.mjs build`. Validate the generated config, run `wrangler deploy --dry-run --config dist/server/wrangler.json`, and deploy that config only after appropriate checks. Preserve this DB; do not rerun the initial CREATE schema over it. Future schema changes must be additive migrations. The database UUID/account ID are configuration identifiers, not credentials; OAuth stays in Wrangler's credential store.

A Worker rollback changes application code, not saved data. Use the known prior version from deployment history only after considering record compatibility. Do not delete/recreate the database to roll back a UI or extension change. Older guest Pages URLs are not the live backend target.
