# Direct customer-account Cloudflare build

This target builds the same application with a plain Cloudflare/Vinext Worker entrypoint. Sites authentication and connector injection are omitted from this target. The original Sites target remains the default. Accounts in a new customer D1 database are separate from the current review site's users; no credentials/data are copied automatically.

## Confirmed implementation
- `TOOLKIT_DEPLOY_TARGET=cloudflare node node_modules/vinext/dist/cli.js build` succeeds.
- Import API requires a valid first-party session, reserves at most 5 attempts per user and 100 globally per fixed 15-minute window before page fetching. Failed attempts count. Exhaustion returns 429; unavailable storage fails closed. Existing indexed auth_limits stores counters, so no migration is added for quotas.
- UI disables URL import for guests and explains sign-in/limits. Pasted content and calculators remain usable.
- Direct Worker entrypoint is deployment/cloudflare-worker.ts. It does not depend on the Sites private access gate.

## Deployment blockers — 13 October 2026
- Connected Cloudflare account: Workers/D1 listing works; subscription listing returns API 10000 Authentication error. `default_usage_model=standard` does not prove Workers Free. No billing or subscription changes have been made.
- Current server scrypt hashes: local Node CPU samples 211, 204 and 201 ms. These are local measurements, not production Cloudflare CPU measurements. Workers Free documents 10 ms per invocation; compatibility is not established and there is a material risk of login failure. Password security has not been weakened.
- CLI is not logged in; account operations can use the connected plugin after permission/plan verification. Never paste tokens into chat or commit them.
- Existing URL importer still has the documented DNS preflight/connection-pinning limitation. General public crawl access requires controlled egress hardening.

Do not publish this full password backend as a verified free production release until plan and CPU compatibility are resolved. Alternatives: maintained-library passkey authentication with production CPU validation, or a user-owned password backend on existing infrastructure. No password verifier, session token, or recovery code should be moved to localStorage.

## Commands after the gates are satisfied
1. Install the pinned dependencies using the repository installer/package manager.
2. Create a D1 database named professional-toolkit in the verified target account; record its returned database ID. Apply the generated schema in drizzle/0000_swift_wendigo.sql to the new database. Do not run it over an unrelated existing database.
3. Set TOOLKIT_DATABASE_ID to that returned ID, TOOLKIT_DEPLOY_TARGET=cloudflare and build. Never use the placeholder ID in production.
4. Run TypeScript, regression tests, and `wrangler deploy --dry-run --config dist/server/wrangler.json`.
5. Deploy the generated Worker/assets using the plugin or an authorized Wrangler session, with the returned real DB binding. Select the intended workers.dev/domain audience explicitly. Do not create a paid subscription or AI credits.
6. Verify registration/passkey or password login, recovery, private report ownership, import quotas and logout against the deployed URL. Record the actual URL/version and checks. Roll back the Worker on failures; application rollback does not undo database changes.

No Cloudflare resources were provisioned or deployed in this preparation. No production deployment success is claimed.
