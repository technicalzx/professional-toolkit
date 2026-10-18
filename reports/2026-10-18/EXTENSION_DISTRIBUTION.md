# Chrome extension distribution: 18 October 2026

## Delivered scope

The existing extension source stays in [`extension/`](../../extension/README.md) in the same public repository. Extension **0.1.3** adds **Help & updates** without new permissions or background behavior. The website now exposes `/extension` from desktop/mobile home navigation and the capture page, with a direct ZIP download, GitHub source, current version, desktop setup, manual update/reload steps, current-site address and explicit consent/privacy guidance.

The release has an explicit nine-file inventory including its README and MIT license. The package builder normalizes checkout line endings and fixes ZIP metadata, producing identical Windows/Linux bytes. `/extension-release.json` records the manifest version, download/install/source URLs, size, file inventory and checksum. CI rejects stale shared source, metadata or ZIP instead of silently publishing a different extension than the repository source.

- Packaging/help milestone: `baa9b59`.
- Website/preview/browser integration: `350e7c8667b9b3294d7b4efee66431a9e18e7961`.
- Review: [PR #11](https://github.com/technicalzx/professional-toolkit/pull/11). Independent read-only review found no material issues after two instruction-label corrections.

## Observed verification

- `python -m unittest discover -s tests -v`: **10 passed**, including allowlisted ZIP contents, authoritative source/license parity, checksum, deterministic CRLF/LF/file-time behavior and stale artifact detection.
- `python scripts/package-extension.py --check`: sources, ZIP and public metadata match.
- Application Node suite: **148 passed**, including Worker/D1 ownership, account deletion, private reports/projects and capture consent/contracts. TypeScript passed. Five-stage production build, client preview build and packaged Worker route/asset checks passed. Production dependency audit found no known vulnerabilities.
- Clean GitHub CI on `350e7c8`: both verification jobs, all three analyses, CodeQL and Pages upload passed. [PR checks](https://github.com/technicalzx/professional-toolkit/actions/runs/39091669191), [push checks](https://github.com/technicalzx/professional-toolkit/actions/runs/39091637370). Final delivery-record and default-branch checks are verified separately after publishing.
- `scripts/verify-extension-download.mjs` passed locally and against live HTTPS in installed Chrome: desktop 1440px and mobile 390px discovery from home/capture, install/update instructions, correct source/version, actual ZIP download bytes/size/SHA-256, copy actions and no horizontal overflow or uncaught page errors. The test creates no user data. Screenshots were visually reviewed: [desktop](assets/extension-install-desktop.png), [mobile](assets/extension-install-mobile.png).
- `TOOLKIT_VERIFY_LIVE_EXTENSION=1` loaded-extension acceptance passed against the live site using synthetic page content: account connection, activeTab extraction, packaged handoff, private save and saved-title sync. Exact served ZIP parity passed; only that test account was deleted, with HTTP 200 required before PASS. This test did not invoke AI or access an owner's real platform session.

Initial local failures were environmental and retained as observations: the cached Chromium failed Windows side-by-side startup, so the browser checks used installed Chrome 155 in a fresh disposable profile. The deeply nested workerd path failed direct startup and four integration-test files reported Node native assertions. Copying the unchanged installed binary to a shorter workspace test path, checking equal SHA-256 and setting process-local `MINIFLARE_WORKERD_PATH` made all 148 tests and the preview Worker checks pass. These observations support a Windows path-length startup problem; no application workaround, global runtime change or disabled integrity check was required. Clean Linux CI independently passed. An isolated newer Node download did not fix the original path problem and was not added to the repository.

## Live release

- Guide: https://professional-toolkit.abihurairahansari.workers.dev/extension
- ZIP: https://professional-toolkit.abihurairahansari.workers.dev/toolkit-capture-extension.zip
- Metadata: https://professional-toolkit.abihurairahansari.workers.dev/extension-release.json
- Extension: **0.1.3**, **31,486 bytes**.
- ZIP SHA-256: `08b09aa690432222c1df45a6313bdef42ebccc100da93e17ca48b1e03afeb67a`.
- Cloudflare Worker version: `f5b88a6f-6720-4b5e-bbbd-077ba097241a`.
- Deployment dry run and deployment passed. Reported Worker startup: 12ms; this is not request latency, CPU usage or a performance benchmark. Existing D1 and AI configuration were preserved. Exact identifiers/digests remain in [`live.json`](../../hosted-app/deployment/live.json).

## Maintenance and limits

The existing five-hour automation was updated and read back as ACTIVE with the same cadence. It now explicitly covers extension research, observed bugs, compatibility, permissions, capture/transfer/account journeys, performance/accessibility, justified upgrades, manifest versions, reproducible downloads and live checksum checks. Independently useful fixes/features/upgrades keep their tests and meaningful commits; reviewed passing PRs merge with individual history preserved. No empty commits, trivial splitting or manufactured issues/activity. This request authorized publishing the current download/install update; future production releases retain separate authorization.

This remains an unpacked developer extension. Downloading a ZIP does not install it, and unpacked installations update manually. Real authenticated vendor layouts and actual optional-permission prompts require owner acceptance; the isolated loaded-extension fixture pre-grants only its exact toolkit host. A Web Store listing/automatic consumer updates remain future distribution work. Primary references: [Chrome install/reload](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world), [Chrome distribution](https://developer.chrome.com/docs/extensions/how-to/distribute). No third-party source or dependency was copied.

Next: prioritize reproduced owner capture/permission failures and useful feedback quality before expanding platform access. Keep package/source parity and least-privilege consent boundaries intact.

## Separate Workers Builds repair

After the delivery-record push, Cloudflare added a separate failing Workers Builds check on `4785dec`. All seven GitHub verification/security/Pages checks on that head passed. The owner supplied the failed build log: root directory `/`, no application build, and unpinned `npx wrangler preview`, which failed for a missing beta `previews` block. The Builds API returned 403 to the deployment login; the connected plugin can access only a different account.

A separate pipeline repair adds `pnpm run build:cloudflare`, with validated public deployment defaults, explicit Cloudflare output and post-build checks that D1 and AI bindings were preserved. Three configuration-failure tests pass; the actual five-stage build and generated binding checks passed. The pinned command `wrangler versions upload --config dist/server/wrangler.json` also succeeded without promoting live traffic: version `8c9297ac-5071-4af2-aae6-bfecdfce2e85`. A Version URL shares the configured resources; it is not an isolated database.

The owner must apply the concrete [Workers Builds settings](../../hosted-app/deployment/WORKERS_BUILDS.md) and retry the latest head, or connect the correct account with Workers CI access. The repository helper cannot change dashboard settings through a denied API. This check is not bypassed and PR #11 remains unmerged until the corrected check passes. The already verified live release remains available at the guide and ZIP URLs above.
