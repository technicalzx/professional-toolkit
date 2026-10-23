# Website import egress policy

Decision date: 23 October 2026 (Asia/Karachi).

## Behavior and trust boundary

General server-side URL fetching is disabled. Without a valid operator-supplied origin policy, `importPage()` makes **no DNS lookup, robots request or page request**. The response explains the existing alternatives: review/redact page text, import snapshot JSON, or use the user-triggered Chrome capture flow. These paths do not depend on the server retrieving a vendor profile URL.

A deployment may enable a limited importer for up to 16 **exact, operator-owned or explicitly reviewed trusted HTTPS origins**. This is a narrower capability, not arbitrary public-web import and not DNS pinning. An origin entry grants outbound access to that host's reviewed pages, so it is a security decision. Do not add customer-controlled DNS, wildcard hosting namespaces, unclaimed subdomains, open proxies or domains selected from the incoming URL. Do not infer approval of subdomains, sibling hosts or redirect targets. Operator review must include control of DNS and any user-controlled hosting/proxy behavior on the approved origin.

The existing A/AAAA checks remain defense in depth. Workers' later `fetch()` performs its own connection resolution. **The allowlist does not bind that connection to the prior DNS answer.** If an approved origin's DNS/hosting control is compromised, or an operator approves a hostile origin, the preflight-to-connection gap remains. Leave the policy empty when this trust cannot be established. A genuinely enforced egress service or transport is required before reopening arbitrary-domain imports; do not describe this change as connection-level SSRF prevention for the whole Internet.

The production policy must be reviewed separately from source/Preview acceptance. A merged implementation or new configuration example does not mean live traffic was promoted.

## Deployment configuration

`TOOLKIT_IMPORT_ALLOWED_ORIGINS` is a server-side deployment variable containing a JSON array, for example:

```json
["https://portfolio.example.org"]
```

This is a documentation fixture, not an origin to enable automatically. The route passes only the deployment variable as `allowedOrigins`; request JSON contributes only its `url`. Changing the browser form, adding an `allowedOrigins` request field or selecting a different initial URL must never change the policy.

Accepted entries contain an HTTPS origin only: no credentials, custom ports, paths, query, fragment or wildcard. Standard URL normalization handles host case and a trailing slash; exact canonical origins are compared. A maximum of 16 entries and 8,192 characters of serialized configuration keeps parsing bounded. Malformed or partly invalid configuration fails entirely; it does not silently retain a permissive subset.

Keep this variable separate from customer preferences and source project documents. Add/remove origins through the reviewed deployment process, record why the operator trusts the host, and remove entries when ownership, DNS, hosting or proxy behavior changes. This implementation adds no default approved destination and creates no new paid service.

| Condition | Result | Outbound target access |
| --- | --- | --- |
| Missing/empty policy | `URL_IMPORT_DISABLED`, HTTP503; capture/JSON/paste guidance | None, including DNS |
| Malformed policy | `IMPORT_POLICY_INVALID`, HTTP503; configuration unavailable guidance | None |
| Valid policy, URL outside exact origins | `IMPORT_ORIGIN_NOT_ALLOWED`, HTTP422; alternatives | None, including DNS for that URL |
| LinkedIn/Fiverr/Upwork URL | Existing `PLATFORM_CONNECTION_REQUIRED` | None; capture/manual path stays available |
| Approved origin | Existing bounded single-page importer | Public DNS preflight, robots and HTML only |
| Page redirects to another origin | Every new origin must be explicitly approved | No DNS/robots/page fetch for a nonapproved target |
| Robots redirects or robots cannot be checked | Fail closed | Does not follow the robots redirect |

## Preserved controls

The importer still requires HTTPS domain names, denies IP literals/credentials/custom ports, enforces conservative public A/AAAA checks, checks robots rules and explicitly handles page redirects. The stricter domain/IP parsing rejects malformed labels, leading-zero/empty IPv4 octets, invalid IPv6 and conservative special/documentation prefixes. DNS JSON is capped at 64 KiB; robots at 64 KiB; page responses at 512 KiB. Abandoned/oversized responses are cancelled. A 12-second request deadline, three redirect transitions, HTML content types, human-verification detection and an 80-character readable-text minimum remain.

Requests omit credentials, use a fixed importer user agent and no-referrer/no-store options, and never forward browser cookies or authorization headers. The result still includes supplied source URL, retrieval time, extracted text and limits; an approved origin is not proof of truthful content or permission to reuse it. Sign-in, request quotas and same-origin route authorization remain separate server controls.

The allowlist is copied into a fresh set before asynchronous work, so a mutable caller array cannot expand a request's policy during DNS or network waits. Redirects use manual mode and repeat URL/platform/policy/DNS/robots checks; there is no fallback to unrestricted global fetch after a policy or provider failure.

## Why not pretend to pin fetch?

Current primary references were retrieved on 23 October 2026:

- [Cloudflare Request API](https://developers.cloudflare.com/workers/runtime-apis/request/): `resolveOverride` selects a hostname under zone restrictions. It is not a general API to connect arbitrary external HTTPS URLs to a previously checked IP.
- [Cloudflare Node HTTPS compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/https/): its client wraps Workers fetch, and options including `servername` are unsupported. Substituting an IP and setting `Host`, or a Node Agent override, must not be represented as verified TLS/SNI-preserving pinning.
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html): distinguishes fixed trusted destinations from arbitrary external destinations, and explicitly warns that a domain allowlist/DNS preflight alone does not prevent rebinding. Connection-enforced destination validation and redirect/retry policy are necessary for general egress.
- [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/): retain bounded streaming, explicit failures and narrow bindings. This repair adds no provider credentials, dynamic socket parser or unrestricted retry route.

An eventual general-purpose egress service must resolve all candidate A/AAAA addresses, reject private/special destinations and mixed answers, connect only to a validated address while verifying TLS against the original hostname, and apply the policy to every redirect/retry/fallback. It must also enforce response/time/concurrency bounds without access to privileged service networks. That service is not implemented or claimed here. Evaluate a supported provider/transport and its operating cost separately; do not restore arbitrary fetch merely because mocked DNS tests pass.

## Verification

`node --test tests/importer-egress.test.mjs tests/toolkit.test.mjs` passes 31 checks: 17 new egress cases and 14 existing tool/import cases. Fixtures are local mock responses; no private/metadata address, real profile, vendor session or production mutation is requested. Cases include no-I/O defaults/configuration errors, exact-origin matching, attacker-host denial before DNS, approved positive imports, per-hop redirects, mutation-safe request policy, robots redirects, platform alternatives, malformed/public/special IP parsing, mixed DNS answers, DNS-denied redirected requests, DNS-response bounds and stream cancellation. Existing robots/content-type/human-verification/provenance assertions retain their original behavior with an explicit approved fixture origin.

These tests demonstrate policy enforcement and preserve the restricted importer; they do not prove an approved host's DNS cannot change between preflight and connection. Full route/UI/build/CI and release verification belong to the integrating change.
