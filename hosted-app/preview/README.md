# Temporary Cloudflare Pages preview

Project: professional-toolkit-test
URL: https://professional-toolkit-test.pages.dev
Created 13 October 2026 (Asia/Karachi) in the owner's connected Cloudflare account. The pre-existing professional-toolkit Pages project was left untouched.

This temporary release runs the existing React dashboard as a client application. Available: pasted-content profile checks, job/brief comparison, proposal outlines, calculators, local saves and JSON export. It explicitly disables account writes, account sync, URL import and passkeys. No credentials are collected; no database, AI, browser-rendering resource, paid subscription or credits were created.

Build from hosted-app with its pinned dependencies installed:

```sh
node node_modules/vite/bin/vite.js build --config preview/vite.config.ts
node preview/pack-worker.mjs
node preview/check-worker.mjs
```

pack-worker embeds the three built text assets in an advanced-mode Pages Worker. Direct Upload uses an empty asset manifest and `_worker.js`. This packaging fits the connected API's supported upload path. It is NOT CDN-only static hosting: each uncached network request invokes a Pages Function and counts toward the account's Workers request allowance. The Worker performs only route lookup and response construction; calculations run in the browser. Immutable browser caching is enabled for hashed assets. Move to native static-asset upload before wider launch if unlimited static request handling is required.

The code sends noindex headers. The preview is publicly accessible and is not a private-data workspace. Browser-local results remain on the user's device unless explicitly exported. Existing Sites accounts do not transfer to this preview.

Validation: Vite production build passed; local Miniflare checks passed for index, JS, CSS, account route, guest account API, rejected account writes and unknown paths. Local Miniflare used compatibility date 2026-05-15 because its installed runtime does not yet support 2026-10-12; Cloudflare deployment uses 2026-10-12. Cloudflare reported the first upload successfully deployed. Direct live HTTP checks from the coding environment were blocked with 'Calls to this URL are not allowed'; no manual browser pass is claimed.

A second deployment corrects the preview label. Record its confirmed final status in deployment.json. No automatic expiration is configured: 'temporary' describes its test purpose. Delete this test project when it is no longer needed; do not delete the separate professional-toolkit project.
