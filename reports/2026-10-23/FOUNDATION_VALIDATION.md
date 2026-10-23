# Audited foundation implementation

Date: 23 October 2026. Source validation only; production traffic, database and extension release are unchanged. This record describes completed checks without publishing private audit reproductions.

## Ordinary report mutation authority (A01 / N01)

Report creation and deletion now include the exact authorizing session, owner, credential version and expiry in the D1 mutation predicate. Revoking a session while a request body is pending cannot create or delete a report. A final failed predicate returns an actionable sign-in error; the existing quota and active-session idempotent deletion behavior remain.

`tests/report-revocation.test.mjs` runs against an isolated real Miniflare D1 database. Eleven checks pass: delayed POST/DELETE across logout, expiry and password change; active-session positive controls; and revocation immediately before each SQL mutation executes. Fixtures are synthetic, each owner's cascade cleanup is asserted, and the runtime is disposed. The existing authentication suite was also checked by the implementing reviewer before integration. A combined Windows verification encountered a native workerd startup access violation; the isolated final eleven-check suite subsequently passed. This host/runtime failure is not hidden as an application pass.

No schema migration, destructive initialization, production data access or credential logging was introduced. Broader build, browser and exact-head CI verification follow the integrated foundation changes.

## Server importer trust boundary (A02 / N02)

Arbitrary-domain server import now fails closed. An operator may configure at most sixteen exact reviewed HTTPS origins; no policy means no DNS or target fetch. Every redirect repeats the same policy. The route takes this configuration only from its Worker binding, and the build validates/preserves it for production and isolated Preview configurations. The visible form links directly to capture, JSON and paste alternatives.

Thirty-eight focused checks pass across `tests/importer-egress.test.mjs`, `tests/toolkit.test.mjs` and `tests/cloudflare-build.test.mjs`. They exercise no-I/O denials, approved positive fixtures, per-hop redirects, public/special address parsing, robots, streamed size bounds, cancellation and deployment-policy retention. No real private-network target was contacted. This narrowed trusted-origin facility is not connection-time DNS pinning; residual approved-host trust and the future enforced-egress requirement are documented in `hosted-app/docs/IMPORTER_EGRESS.md`.
