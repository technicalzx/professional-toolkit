# Professional Toolkit — Cloudflare free-only plan
Updated 13 October 2026 (Asia/Karachi).

## Verified project and connection status
The existing application is in hosted-app/ and has first-party accounts, D1-backed private reports, URL import, transparent profile checks, brief matching, proposal outlines and calculators. Its review deployment is owner-private on Sites. Sites-managed resources are separate from resources in your connected Cloudflare account; attaching the plugin does not transfer them.

Cloudflare identity and account listing succeeded. Subscription/settings inspection returned Cloudflare API error 10000 (Authentication error). The account plan, permissions and usage are therefore NOT verified. No Cloudflare resources, subscriptions or paid features were created or changed in this investigation. Browser Claude/Kimi sessions were not inspected or used.

## Deployment decision
Do not migrate the entire existing backend unchanged to Workers Free. Cloudflare documents 10 ms CPU per invocation on that plan. The current password KDF is scrypt N=32768/r=8/p=3: local Worker integration tests prove functionality, not Free-plan CPU compatibility. Treat password authentication as a blocking compatibility gate. Never reduce password protection merely to meet a hosting limit.

Preferred first milestone: keep the working review release; make calculators/static UI run primarily in the browser; harden authenticated URL import and usage controls; measure actual CPU before any account migration. For a fully owned production stack, choose passkeys with a maintained open-source WebAuthn library after compatibility testing, or host password operations on an existing user-owned Linux machine through a securely configured backend. An existing machine can avoid an additional subscription, but hosting, availability and operating costs are not inherently zero. If neither route works, stop that migration and report the constraint.

## Free resource choices
Numbers are documented allowances, not a verified statement about this account. Recheck before provisioning.

| Resource | Appropriate purpose | Current free allowance / gate | Decision |
|---|---|---|---|
| Static assets | Toolkit UI, calculators and local document tools | Static asset requests are free and unlimited in Workers pricing | Prefer static/client execution |
| Workers Free | Lightweight API validation and public HTML extraction | 100,000 dynamic requests/day; 10 ms CPU/invocation | Benchmark before deployment; fail on exhaustion |
| D1 Free | Users, ownership, project records and quotas | 5 million rows read/day, 100,000 written/day; 5 GB account-total storage | Indexed queries, bounded retention, explicit export/deletion |
| Browser Run Free | Occasional user-requested rendering of permitted public pages | 10 browser minutes/day, up to 3 concurrent browser sessions | Disabled until plan/access verified; reserve time per job and stop before budget |
| Workers AI Free | Optional evidence-linked rewriting and summaries | 10,000 neurons/day shared allocation; model costs differ | Off by default; allow only verified free-eligible models |
| Turnstile | Bot checks for registration/import | Verify current eligibility and integration configuration before setup | Optional abuse protection, not an authentication provider |
| R2 and other storage | Private uploads | Billing/enrollment and hard-stop behavior not verified here | Defer; local processing/export first |

The latest Workers AI documentation lists some Kimi models as requiring paid billing or prepaid credits. Do not select those for this project. A free web-chat account is not a server API entitlement. Do not interpret a request count limit as a neurons limit or promise a fixed number of free AI answers.

## Ordered implementation slices
### 1. Cost and identity foundation
Confirm the selected account's Workers plan and permissions; inventory existing resources without reading user data or secrets. Keep paid upgrades and prepaid credits disabled. Document the boundary between Sites hosting and customer Cloudflare resources. Benchmark password operations, framework startup, extraction and API serialization against actual deployed Free limits. Preserve strong credentials and session revocation.

Acceptance: exact account/plan evidence, no billing changes, deployment compatibility results, explicit fallback architecture.

### 2. Secure URL workspace
Require a valid first-party session for server imports; add atomic per-user/global quotas and concurrency control. Start with one-page HTTPS fetches; cache only permitted public material with an expiry and provenance. Bound bytes, time, redirects and extraction work. Prevent internal-IP requests at every hop; resolve the already documented DNS-preflight versus connection-pinning gap before opening general public crawl access.

For multi-page work, require an explicit user-owned or permitted origin, limit depth/page count, honor robots rules, deduplicate canonical URLs and return partial results. Imported content is data, never instructions for tool use. Login walls, private profiles and restricted platforms use pasted text or authorized APIs.

Acceptance: unauthorized/over-quota calls make no external request, unsafe destinations and redirects are rejected, budget reservation survives concurrency, every source has URL and retrieval time.

### 3. Persistent projects
Extend D1 with owner-scoped projects, sources, analysis versions and usage reservations. Use generated schema-only migrations and indexes; enforce ownership server-side. Add account-wide JSON export and restore verification, retention settings and per-project deletion. Do not automatically upload browser history.

Acceptance: cross-user isolation, atomic quotas, reversible deployment plan, tested backup/restore procedure.

### 4. Optional browser rendering
Use Browser Run only when plain HTML is insufficient and the target permits access. Enforce a small page/time cap, concurrency semaphore, global daily reserve and an owner-visible kill switch. Pause when quota/permissions are unknown. Check the documented crawl API separately before choosing it; this investigation did not verify crawl-specific availability or rates.

Acceptance: real rendered extraction, no login bypass, safe redirect/subresource controls, all browsers closed, time-based budget enforcement. No browser feature should be described as unlimited crawling.

### 5. Evidence-linked AI
Enable only after Free plan, model eligibility and usage reporting are confirmed. Require user consent before sending profile/resume content. Bound input/output tokens; reserve usage using the selected model's current neuron accounting with a safety margin. Release or reconcile reservations after requests. Use a global cutoff below the allocation and deterministic tools when AI is unavailable.

Return schema-validated suggestions with source references; avoid invented skills, qualifications and metrics. Keep editable originals and show which text was generated. Do not fall back automatically to a paid provider.

Acceptance: concurrent budget tests, exhausted-quota fallback, no private data in logs, clear source attribution, no paid-model route.

### 6. Maturity and wider launch
Add keyboard/mobile review, basic service health, private error reporting, versioned prompts and fixtures. Keep secrets server-side. Test account recovery, deletion, abuse controls and restore. Change site audience only when explicitly authorized; public source code does not imply a public deployment.

## What the user can resolve
Reconnect the Cloudflare plugin to the intended account and grant the read/manage permissions needed for Workers and D1; subscription/plan visibility may require a separate billing permission. Do not share raw API tokens in chat. Confirm Workers Free in the Cloudflare dashboard if billing metadata remains inaccessible. No paid upgrade is necessary for this investigation.

The uploaded image(3).png was unavailable at its supplied local path. It is not needed to complete this plan; reattach only if it contains a specific error you want diagnosed.

## Sources checked
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- D1 pricing and hard Free limits: https://developers.cloudflare.com/d1/platform/pricing/
- Browser Run pricing: https://developers.cloudflare.com/browser-run/pricing/
- Workers AI pricing and paid-only models: https://developers.cloudflare.com/workers-ai/platform/pricing/
