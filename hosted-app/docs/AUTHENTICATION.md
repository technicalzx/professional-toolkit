# First-party accounts — v0.3

The toolkit owns registration, credentials, sessions, recovery and report authorization. There is no authentication SaaS, OAuth provider, email service, subscription or external account required by this application layer. The review deployment still uses existing Sites hosting and its owner-private access gate. D1 is the existing hosting platform's database; this release is **not** an infrastructure-independent self-hosted server. No new paid service has been configured.

## User procedures

1. Open `/account`, choose **Create account**, enter a display name, username and unique passphrase (15+ characters, at most 256 UTF-8 bytes).
2. Download the six recovery codes immediately. Keep them private, preferably in a password manager or offline. They are shown once and never stored in plaintext on the server.
3. Sign in with the username and passphrase. Usernames are case-insensitive; display names are not verified identities. Email addresses are neither collected nor verified.
4. Run tools as usual. **Save on device** stays in that browser. **Save to account** explicitly copies the current report into private account storage. Open an existing browser report and choose Save to account to transfer it. Nothing is uploaded automatically. Accounts hold up to 50 reports, each within a 64 KiB request limit.
5. Open Saved reports to view account reports, open a report to export its JSON, or delete individual account reports. Local reports are listed separately.
6. From Account & security, change the display name, change the passphrase, sign out this device or all devices, replace recovery codes, or permanently delete the account and account-saved reports. Password changes revoke every session. Code replacement and deletion require the current password.
7. If the password is lost, use Recovery with the username, **one unused code**, and a new passphrase. The code is consumed atomically; existing sessions stop working. Sign in with the new passphrase. Remaining codes still work; replace the set after recovery if compromise is suspected.
8. Without a password or unused recovery code, there is no email or administrator bypass. Deleting an account cannot erase browser-local reports or downloaded exports; users must remove those separately.

## Security design

- Salted scrypt `N=32768, r=8, p=3`, 16-byte random salts and 32-byte derived keys. This is one OWASP-recommended parameter set, chosen because the runtime does not support native Argon2. It uses `node:crypto`, not a home-grown password algorithm. Password comparison uses `timingSafeEqual`; unknown-user login performs the same KDF cost.
- 256-bit random opaque session tokens. Only SHA-256 token digests are stored. `__Host-toolkit_session` is Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, with a seven-day absolute lifetime. No credentials/tokens in localStorage. At most ten sessions are retained per user.
- Per-user credential version invalidates sessions after reset, password changes or sign-out-all. Session insertion checks the version to avoid a login racing a password change.
- Six random 128-bit recovery codes, stored only as SHA-256 digests. Password reset and single-code consumption are atomic in D1. Concurrent resets cannot both change a password based on the same credential version. Replacement is an atomic guarded batch.
- Mutations require exact same Origin and JSON, reject cross-site Fetch Metadata and enforce streamed byte limits. No permissive CORS headers. Account/report responses use no-store. SQL is bound, never concatenated from input.
- D1-backed fixed 15-minute counters: 40 account mutations per trusted edge IP, 12 login/register/recovery attempts per username, 20 protected mutations per user, 100 report writes per user. Successful attempts also count. IP and username bucket keys are hashed. When an edge IP is unavailable, requests share a conservative fallback bucket; deployment behind another proxy must strip spoofable headers and inject a trusted client IP.
- Reports are authorized by the server-side session's user ID; client-supplied owners are ignored. Deletes scope both report and owner. Foreign keys cascade account deletion. Invalid sessions cannot read reports.
- Expired rate buckets and sessions are removed during account writes. No background job or GitHub Action was added.
- Recovery codes are never logged. Generic server logs contain event names only. No administrative user enumeration endpoint or hidden password-reset route exists.

## Operations and maturity gates

Schema is declared in `db/schema.ts`; generated SQL and metadata live in `drizzle/`. `.openai/hosting.json` declares `DB`; hosting applies migration before deploying. Back up user data under a documented retention/access policy before wider launch. Rollback of application code does not undo database migrations or user records. Never edit an applied migration in place.

This release is an implemented account foundation, not a claim of a completed independent security audit. Before a public multi-tenant launch: test backup restore, assess password hashing under production concurrency/CPU limits, test edge-IP trust and abuse controls, add infrastructure monitoring, resolve importer DNS rebinding/egress hardening, and conduct an independent authentication/access-control review. Global bot defense and a breached-password blocklist are remaining improvements. The importer retains the review release's existing access behavior and is not yet governed by individual account quotas.

Next account milestones: opt-in self-hosted WebAuthn/passkeys or TOTP MFA with audited libraries; session/device management; project revisions; private file storage and quotas; roles/team authorization; account-wide export. SMTP recovery would require an explicitly configured mail system and verified email flow, not a fake send button. Hosting audience remains owner-private until explicitly changed.

For an independent Linux deployment, port the D1 access adapter to SQLite/PostgreSQL, apply the same schema/ownership constraints, terminate HTTPS, trust only the controlled reverse proxy, and repeat the runtime/abuse tests. Authentication logic is open-source in this repository; no provider identity is embedded in the user model.

## References checked 2026-10-12

- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
