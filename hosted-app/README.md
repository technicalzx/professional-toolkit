## v0.3 — first-party authentication

Open `/account` for registration, sign-in, recovery, password and session controls. Reports can now be explicitly saved to a private account across devices. No external authentication provider is required. Read [user and operator procedures](docs/AUTHENTICATION.md). The hosted review remains owner-private.

# Professional Toolkit 0.2

A React/TypeScript professional workspace with a Cloudflare Worker URL importer.

## Available

Public HTML import with source preview; five-check evidence-based content audits; literal job-brief comparison; editable proposal templates; hourly and project pricing; GPA and percentage calculators; browser-local reports, favorites and JSON exports.

LinkedIn, Upwork and Fiverr require pasted content or a future authorized adapter. AI, live analytics and billing are not connected. First-party accounts and private report storage are implemented; hosting readiness remains subject to the deployment gates.

## Development

Use Node 22.13+ and pnpm. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. The supported hosting starter uses Vite/Vinext and a Worker runtime. HTMLRewriter requires that runtime, not plain Node.

## Validation

- `node --test tests/toolkit.test.mjs tests/extraction.test.mjs tests/auth.test.mjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `pnpm build`

See docs/UPGRADE_PLAN.md for phased architecture, feature dependencies and maturity gates. Browser interaction/accessibility testing is still pending.

## Privacy and boundaries

The Site remains owner-private. Import responses are not persisted server-side. Only saved analysis results enter browser storage; browser storage is not encrypted or cross-device. Imported text is untrusted evidence. No credentials or cookies are sent to target sites.

The importer restricts HTTPS, addresses, redirects, robots policy, time and byte limits. DNS preflight does not pin a subsequent fetch connection; production public access needs controlled egress plus authenticated distributed quotas. Do not treat this review release as a hardened multi-tenant SaaS.

The legacy Python starter remains in the parent GitHub repository. This hosted application is the current review experience.

## Connected workflow development

Open `/workflows` to plan dependent tasks for freelance delivery, student projects or professional work. Supply requirements, evidence notes, available time and estimates; compare the baseline with a higher-effort scenario. The algorithm and its limits are visible in the result. Save one plan on the device, save account snapshots, reopen them from Saved reports, or import/export JSON. No provider or new infrastructure is required for local planning.

Inputs remain in page memory unless explicitly saved/exported. Device snapshots are unencrypted. Account snapshots use the existing private report API and its size/count limits. Large plans can be downloaded even when they exceed the account report limit. Loading an example, restoring/importing a plan or resetting replaces the current editor contents. Saved outputs are recomputed from validated inputs when reopened.

See [research and design](../reports/2026-10-16/RESEARCH.md) and [validation](../reports/2026-10-16/VALIDATION.md). Planned extraction, evidence verification, calendar integration and multi-person scheduling are not implemented.
