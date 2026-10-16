# Profile and website capture workflow

This implements the source-snapshot alternative from the research report. On the toolkit, open `/capture`. Use the packaged Chrome extension on a profile you can access, import its versioned JSON, or enter a manual source snapshot. This avoids the existing server importer's domain block without pretending to have a platform API connection. No platform credentials are collected.

## User workflow

1. Open `/capture` and follow **Install and connect the Chrome extension**. The downloadable ZIP is served at `/toolkit-capture-extension.zip`.
2. Sign in on the toolkit, then connect the extension to that exact website origin. Platform sign-in stays on the platform and toolkit sign-in stays on the toolkit.
3. Open the chosen source profile/page and expand the relevant sections. Click Capture, inspect/redact the preview, add a request and confirm the transfer.
4. Inspect the received source in the website. Local review provides transparent text checks and a literal excerpt lookup for the request. AI review provides an open-ended answer only when configured and explicitly consented to.
5. Save privately to the account, export the snapshot/review, or clear the page. Saved reports open `/capture?report=...`; the extension can sync their titles and reopen them. No automatic saving or provider invocation follows a browser message.

An existing profile URL remains a source locator. Captured/imported data is marked unverified and timestamped. No live rank, earnings, ownership verification or exhaustive profile coverage is claimed. The existing public HTML importer remains available for supported websites; the website now directs restricted-platform users to capture/JSON instead of repeated URL retries.

## Snapshot contract

`schemaVersion:1`, `sourceUrl`, `title`, `text`, `headings`, `capturedAt`, `captureMethod`. Platform and limitations are derived by the receiving validator, not trusted from incoming labels. Unknown fields are discarded. Source URLs are public HTTPS locators with tracking query/fragment removed; text is 80–20,000 characters. A browser message includes the channel, a one-time routing nonce, the snapshot and a bounded request. The nonce does not authorize an API operation.

`lib/capture/snapshot.mjs` is authoritative. `python scripts/package-extension.py` from repository root mirrors it into the extension and creates a reproducible ZIP. The parity test detects a stale mirrored contract. Extension logic uses local packaged modules only.

## Optional AI configuration

`POST /api/capture/review` requires an existing first-party account, same-origin JSON, a validated snapshot, request and explicit `consent:true`. The Worker needs an `AI` binding and a `TOOLKIT_AI_MODEL` variable naming a supported JSON-mode model. No user-supplied endpoint or credential is accepted.

The direct Cloudflare Vite target adds the AI binding/model variable only when `TOOLKIT_AI_MODEL` is provided at build time. Example operator sequence in PowerShell, after selecting a currently supported model and verifying the account/usage budget:

```powershell
$env:TOOLKIT_DEPLOY_TARGET='cloudflare'
$env:TOOLKIT_DATABASE_ID='your-verified-database-id'
$env:TOOLKIT_AI_MODEL='your-supported-workers-ai-model-id'
npm run build
```

Other hosting targets must explicitly supply these bindings through their own supported deployment configuration. Existing hosting/authentication/egress gates remain applicable. No model, account plan, paid subscription or remote AI call was activated by this change. Without configuration the endpoint returns `AI_NOT_CONFIGURED` and local review still works.

Requests reserve at most five per user and 100 globally per fixed 15-minute bucket before model invocation, using indexed existing rate-limit storage. Malformed requests and absent configuration do not consume model requests. Provider failures consume reservations and do not retry automatically. A 25-second response timeout does not guarantee cancellation of provider-side computation or billing. Output is capped and schema-checked; each finding must quote a literal source excerpt. Quote matching does not prove the model's interpretation. No user content is logged by the adapter.

## Account and sync design

No new token grant or database table is required. Account actions remain cookie-authenticated, same-origin and ownership-enforced. The extension invokes narrowly defined fetches inside the granted toolkit tab; it receives public account display fields or at most five saved review titles/IDs. Cookies never enter extension storage, messages or URLs. Review saving remains an explicit website action through the existing private-report API. Existing size/count and deletion-cascade limits apply.

Local browser snapshots stay in memory until transfer/download. Popup closure discards them. Website state is also in memory until explicit saving/export. Saved review reopening validates source and findings; local results are recomputed. Device downloads are user-managed and are not deleted by account deletion.

## Validation and limits

See repository `reports/2026-10-16/CAPTURE_VALIDATION.md`. Automated tests use synthetic profiles and disposable local accounts. Real platform layouts, optional permission prompts, Chrome Web Store packaging/review and platform access rights need owner validation. See `extension/README.md` for privacy and least-permission details.

The remaining research roadmap—versioned multi-project records, scope-change graphs, learning/career packs, architecture tradeoffs, team workflows and wider integrations—is not represented as delivered by this capture milestone.
