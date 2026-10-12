## v0.3 — first-party authentication

Open `/account` for registration, sign-in, recovery, password and session controls. Reports can now be explicitly saved to a private account across devices. No external authentication provider is required. Read [user and operator procedures](docs/AUTHENTICATION.md). The hosted review remains owner-private.

# Professional Toolkit 0.2

A React/TypeScript professional workspace with a Cloudflare Worker URL importer.

## Available

Public HTML import with source preview; five-check evidence-based content audits; literal job-brief comparison; editable proposal templates; hourly and project pricing; GPA and percentage calculators; browser-local reports, favorites and JSON exports.

LinkedIn, Upwork and Fiverr require pasted content or a future authorized adapter. AI, live analytics, cloud account storage and billing are not connected.

## Development

Use Node 22.13+ and pnpm. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`. The supported hosting starter uses Vite/Vinext and a Worker runtime. HTMLRewriter requires that runtime, not plain Node.

## Validation

- `node --test tests/toolkit.test.mjs tests/extraction.test.mjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `pnpm build`

See docs/UPGRADE_PLAN.md for phased architecture, feature dependencies and maturity gates. Browser interaction/accessibility testing is still pending.

## Privacy and boundaries

The Site remains owner-private. Import responses are not persisted server-side. Only saved analysis results enter browser storage; browser storage is not encrypted or cross-device. Imported text is untrusted evidence. No credentials or cookies are sent to target sites.

The importer restricts HTTPS, addresses, redirects, robots policy, time and byte limits. DNS preflight does not pin a subsequent fetch connection; production public access needs controlled egress plus authenticated distributed quotas. Do not treat this review release as a hardened multi-tenant SaaS.

The legacy Python starter remains in the parent GitHub repository. This hosted application is the current review experience.
