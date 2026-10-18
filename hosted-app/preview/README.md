# Temporary Cloudflare Pages preview

Project: professional-toolkit-test
URL: https://professional-toolkit-test.pages.dev
Created 13 October 2026 (Asia/Karachi) in the owner's connected Cloudflare account. The pre-existing professional-toolkit Pages project was left untouched.

The client preview routes `/`, `/tools`, `/capture`, `/workflows` and `/account` to their corresponding screens. Project workflows, loaded-page snapshots, local review, device saves and JSON export work without an account. Account writes, account sync, server URL import and AI are unavailable on this target. No credentials are collected; no database, AI, browser-rendering resource, paid subscription or credits were created. Source changes require a rebuild and deployment before the public URL updates.

Build from hosted-app with its pinned dependencies installed:

```sh
node node_modules/vite/bin/vite.js build --config preview/vite.config.ts
node preview/pack-worker.mjs
node preview/check-worker.mjs
```

pack-worker embeds built assets in an advanced-mode Pages Worker, preserving ZIP/image/font bytes through base64 encoding. It skips its own generated Worker when rerun. Direct Upload uses an empty asset manifest and `_worker.js`. This packaging fits the connected API's supported upload path. Each uncached network request invokes a Pages Function and counts toward the account's Workers request allowance. The Worker performs only route lookup and response construction; project processing runs in the browser. Immutable browser caching is enabled for hashed assets. Move to native static-asset upload before wider launch if unlimited static request handling is required.

The code sends noindex headers. The preview is publicly accessible and is not a private-data workspace. Browser-local results remain on the user's device unless explicitly exported. Existing Sites accounts do not transfer to this preview.

Validation: Vite production build passed; local Miniflare checks passed for index, JS, CSS, account route, guest account API, rejected account writes and unknown paths. Local Miniflare used compatibility date 2026-05-15 because its installed runtime does not yet support 2026-10-12; Cloudflare deployment uses 2026-10-12. Cloudflare reported the first upload successfully deployed. Direct live HTTP checks from the coding environment were blocked with 'Calls to this URL are not allowed'; no manual browser pass is claimed.

A second deployment corrects the preview label. Record its confirmed final status in deployment.json. No automatic expiration is configured: 'temporary' describes its test purpose. Delete this test project when it is no longer needed; do not delete the separate professional-toolkit project.
