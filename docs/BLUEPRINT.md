# Product blueprint

## Product and information architecture

One dashboard, one searchable tool registry, reusable input/result/export controls. Categories: Freelancing (profiles, acquisition, business); LinkedIn, Upwork and Fiverr workspaces; Content and Personal Brand; Audit Center; Career; Calculators (finance, education, business); Converters; Image and File Utilities; Analytics; Assistant.

The owner's brief is the expansion specification. Implement full vertical slices rather than empty tool cards. Current milestone implements four tool interfaces; profile audit supports three platforms.

## User journeys

Profile text → explicit assessment criteria → missing information → actionable edits → saved report.
Income target → costs/hours/fee → explained rate → exported result.
Tool search → validated inputs → calculated output → favorites/history.
Future: authenticated project → profile context consent → AI draft → user review → export. No automatic platform posting.

## Target architecture

Frontend: typed component application with a central tool registry, accessible forms and result renderers.
Backend: versioned API, authentication/session service, deterministic tool engine, audited integration adapters, asynchronous file/AI jobs.
Storage: PostgreSQL for durable user-scoped data, private object storage for exports/uploads, worker queue for long operations.
Initial local milestone uses Python standard-library HTTP and browser storage to keep execution reproducible. It intentionally provides no production authentication or database.

## Proposed database schema

users(id, email_unique, password_hash_or_identity_subject, created_at)
sessions(id_hash, user_id, expires_at, revoked_at)
preferences(user_id, theme, locale, consent_flags)
projects(id, owner_id, title, created_at)
tool_runs(id, owner_id, project_id, tool_id, tool_version, input_json, result_json, provenance, created_at)
favorites(owner_id, tool_id) with unique(owner_id, tool_id)
connections(id, owner_id, provider, encrypted_token_reference, scope, expires_at)
exports(id, owner_id, run_id, private_object_key, expires_at)
usage_events(id, owner_id, capability, units, created_at)

Enforce owner_id in every query; integration credentials belong in a secrets manager. Do not store plaintext passwords.

## API architecture

Current: GET /health; POST /api/audit; POST /api/calculate/{pricing,percentage,gpa}.
Future /api/v1: auth/session/logout/reset, profile/preferences, projects, tool-runs, favorites, exports, consent, connections and analytics.
Validate schemas, input sizes and ownership; use consistent error envelopes, request IDs, timeouts and idempotency on writes. Server-side sessions require secure HttpOnly SameSite cookies, CSRF controls and rate limits.

## Feature and dependency map

Local deterministic: calculators, counters/case transforms, unit conversions, configurable grades, manual dashboards, explicit rubric audits, browser image resizing/compression.
AI required: context-aware proposal/content generation, semantic resume matching, recommendations, translation. Use an explicit provider adapter, opt-in data sharing, bounded costs and generated-output labels. No provider configured yet.
Authorized API required: platform analytics, Google Analytics and social accounts. LinkedIn/Upwork/Fiverr support must be verified against actual available APIs and platform permissions. Manual/imported data remain separate.
Fresh sources required: currency rates and jurisdiction/date-specific tax calculations. No hard-coded rates or invented integrations.
Additional libraries/services: PDF editing, OCR, document conversion and background removal. Process uploads in isolated workers with limits and malware checks.
Production infrastructure required: signup/login/reset, user isolation, backups, billing, usage accounting, team roles and observability.

## Data provenance

Every result records user-provided, imported, connected, estimated or generated provenance. Display the timestamp and methodology for connected metrics. No random dashboard statistics or fabricated profile results.

## Delivery phases

1. Blueprint and functional local foundation (this milestone).
2. Production identity, database, authorization tests and reusable typed UI.
3. Resume/job inputs, proposal workflows, content workspace and configurable salary tools; connect an AI provider only with owner configuration.
4. Verified external integrations, file processing and analytics.
5. Accessibility/browser testing, threat review, load testing, backups and deployment hardening.

## QA and deployment

Unit tests cover calculations, fee limits, non-finite inputs and rubric behavior. Add HTTP input/response tests, UI keyboard/mobile checks, cross-user authorization tests and provider failure fixtures as those capabilities land.
Current server is local development only. Production must use a maintained application server behind TLS with authentication, security headers/CSP, request limits, log redaction, dependency scanning, migrations and backup restoration tests. Do not publish the local server as a production service.
