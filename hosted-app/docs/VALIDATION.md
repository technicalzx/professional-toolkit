# Validation — 12 October 2026

14 Node tests passed for URL restrictions, address checks, robots rules, redirect rejection, bounded downloads, platform fallbacks, provenance, audit rubric, literal job matching, proposal templates and calculator boundaries.

A Worker-runtime test passed for HTML metadata extraction and removal of scripts/navigation. TypeScript checking and the production framework build passed before the final documentation update. Final build is repeated during packaging.

No browser automation tool was available, so rendered layout, keyboard interaction, clipboard and mobile behavior remain unverified. External page import behavior depends on each target site and will surface errors rather than fabricate retrieved content.

## v0.3 authentication — 2026-10-12

- `node --test tests/toolkit.test.mjs tests/extraction.test.mjs tests/auth.test.mjs`: **26 passed, 0 failed** (includes parent test and ten authentication subtests).
- Auth suite executes actual `node:crypto` scrypt and D1 SQL in Miniflare/Workers. Covers origin/content-type/body limits, passphrase/username validation, stored credential hashing, Secure/HttpOnly cookies, login failures, duplicate registration, profile updates, report ownership, foreign delete isolation, password/session revocation, one-use and concurrent recovery, recovery rotation, expiry, cascading deletion, sign-out-all and persistent per-account rate limits.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node /root/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/build-site.mjs`: production build passed. Routes `/`, `/account`, `/api/account`, `/api/import`, `/api/reports` generated.
- Generated migration reviewed: five tables with ownership foreign keys, cascading deletes, username uniqueness and lookup/expiry indexes. Migration is schema-only.
- Browser interaction/visual QA was unavailable in this environment. No claim of a manual browser pass, load test, penetration test, backup restore or independent security audit.

## Direct Cloudflare target preparation — 2026-10-13

- Direct Vinext/Cloudflare production build: passed, with a plain Worker entrypoint.
- TypeScript check: passed.
- Regression suite: 27 tests passed, 0 failed. Added Worker/D1 tests for import session requirement, per-user exhaustion and global exhaustion.
- Local password-hash CPU experiment: 211/204/201 ms; not a production Cloudflare measurement.
- Customer deployment remains blocked on verified Free-plan/CPU compatibility. Review deployment was not changed.

- Wrangler deployment dry run passed: 42 modules, 26 static files, 809.77 KiB upload (237.09 KiB gzip). This validates packaging only, not production CPU or live operation.

## Organization publication dependency review — 2026-10-16

- Patched Next.js, React/server DOM, Vite and vulnerable transitive dependencies;
  see [the dependency assessment](DEPENDENCY-SECURITY.md).
- Production dependency audit: no known vulnerabilities. The full audit retains
  one unpatched high advisory in development-only `braces`; it is not suppressed.
- Local TypeScript check, production framework build, six Python starter tests
  and fourteen pure Node behavior tests passed.
- The Miniflare authentication and extraction suites aborted in native Node
  24.19.0 on Windows with `InternalCallbackScope::Close` / `execution_async_id`.
  No Windows Worker-test pass is claimed. GitHub's Linux contributor workflow
  runs the complete Worker/D1 suites, type check, production audit and build;
  inspect the exact publication commit's Actions result before merging.
