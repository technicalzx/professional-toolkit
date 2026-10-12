# Professional Toolkit — upgrade plan

Updated 12 October 2026. Status is implementation evidence, not a promise that every brief feature is available.

## Current release: 0.2

The review application now uses React 19, TypeScript, Vite/Vinext and the hosting platform's Cloudflare Worker build. Dependency versions come from the supported starter and are pinned by pnpm-lock.yaml. Zod validates imported data at the UI boundary. This stack supports a server import endpoint and reusable browser analysis; it is not a claim that any version is the newest available everywhere.

Implemented:
- Public HTTPS page import, readable HTML extraction, user-editable source preview, retrieval timestamps and source links.
- Transparent five-check profile/page audit with excerpts, weights, priority actions and supplied keyword presence.
- Literal job-brief comparison; template-based editable proposal outlines; project pricing.
- Existing hourly rate, GPA and marks tools.
- Responsive React workspace, tool search, favorites, browser-local saved reports, copy and JSON export.
- An in-app roadmap distinguishing available, next and planned capabilities.

Import limits: single public HTML page; no login, browser execution, recursive crawl or paywall bypass. LinkedIn, Upwork and Fiverr imports explicitly require pasted content or a future authorized adapter. Robots restrictions, bot challenges, inaccessible pages and unsupported file types produce actionable errors. The owner-private Site access boundary is preserved.

## Phase 1 — reliable URL and analysis foundation

Delivered in this release. Acceptance: reject internal addresses and unsafe redirects; bound time/bytes; honor robots rules; show evidence, source and time; let users correct extracted content; provide fallback; keep proposal templates visibly separate from AI generation.

Remaining hardening before broader public access: authenticated user quotas and distributed rate limits, DNS-resolution/connection pinning through a controlled egress service, integration observability, internationalized extraction and language-specific rubrics. DNS preflight does not itself pin the later fetch connection, so it is not a complete defense against DNS rebinding. Hosting egress isolation remains part of the security boundary.

## Phase 2 — accounts, projects and reliable persistence

First-party username/passphrase accounts, revocable sessions, one-use recovery codes and user-isolated saved reports are delivered in v0.3. See AUTHENTICATION.md for procedures, security design and remaining maturity gates. No external authentication provider is used. Private files, project revisions and portable database adapters remain planned.

Tables: users; projects(owner_id); sources(owner_id, project_id, URL, provenance, fetched_at, hash); analyses(owner_id, source_id, tool_version, input_hash, result_json); drafts(owner_id, analysis_id, version); favorites(owner_id, tool_id); consents(owner_id, purpose, provider, version); integration_connections(owner_id, provider, encrypted_secret_reference, scope, expiry); exports(owner_id, private_object_key, expires_at).

Acceptance: cross-user isolation tests, server-enforced ownership, migration/backup recovery, account export/deletion, optimistic locking and no secrets in browser bundles.

## Phase 3 — useful AI and career workflows

Configure an opt-in provider adapter with secrets stored server-side, schema-validated outputs, source IDs attached to findings, versioned prompts, input truncation and cost limits. Treat imported pages as untrusted evidence, never as tool instructions. Review generated claims before export.

Deliver: resume parser and job comparison; proposals and cover letters; headline/about/gig revisions; content briefs, hooks and repurposing; before/after comparison and editable output. Deterministic checks stay available when AI is unavailable.

Acceptance: evidence attribution, clear generated labels, provider-failure tests, no fabricated experience, explicit user consent before sending stored personal data to a provider, and evaluation examples covering missing evidence and misleading inputs.

## Phase 4 — integrations, analytics and broader tools

Add adapters only after verifying supported API operations and authorization. A URL is not authorization to access private account data.

| Family | Next deliverable | Dependency / gate |
| --- | --- | --- |
| LinkedIn / Upwork / Fiverr | Profile-specific fields and editable audit workflows | Authorized API where available; otherwise pasted/imported text |
| Analytics | User-owned website traffic and lead dashboards | Real authorized data, time range and provenance |
| Finance | Salary, take-home, fees, margin, ROI, retainers and capacity | User-configurable inputs; dated jurisdiction-specific rules for tax |
| Currency | Exchange conversion with timestamp | Verified rate provider and stale-data behavior |
| Education | Configurable GPA/CGPA, grades and attendance | Institution-defined mappings |
| Content | Calendar, drafts, voice preferences, article/email workflows | Saved projects; optional configured AI |
| Files | PDF, OCR, image resizing and background removal | Isolated processing, file limits and suitable libraries/services |
| Business | Invoices, applications, proposal tracking and revenue | Durable user-scoped data; actual entered/connected records |
| Teams and billing | Shared workspaces, roles, limits and subscriptions | Authorization, billing integration and audited usage ledger |

## Architecture and API evolution

Current POST /api/import accepts a URL and returns extracted content with provenance; it requires same-origin JSON. Calculations and deterministic analysis execute in-browser.

Future versioned API: /api/v1/projects, /sources, /analyses, /drafts, /exports, /connections and /usage. Use schema validation, request IDs, idempotency for writes, bounded retries, timeouts and structured errors. Add job queues for long file/AI workflows; cache only public content with explicit expiry, and never mix user data across cache keys.

## Quality and maturity gates

1. Functionality: real input-to-result behavior, transparent methodology and no inert feature buttons.
2. Security: egress policy, user isolation, safe file handling and reviewed dependency updates.
3. UX: keyboard navigation, screen-reader labels, mobile layouts, errors and loading states.
4. Reliability: importer fixtures, API failures, stale data, export behavior and regression coverage.
5. Release: build and test evidence, versioned roadmap, upgrade migration and rollback path.

No delivery date is invented. Complete one tested vertical slice before expanding the catalog.
