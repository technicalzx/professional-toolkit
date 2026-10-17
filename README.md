# Professional Toolkit

An open-source project workspace for freelancers, students and professionals: turn a brief into linked requirements, deliverables and tasks; record delivery evidence; compare scope changes; and reuse the results in a client review, portfolio or handover.

The current React/TypeScript application is in [hosted-app](hosted-app/). Its root route opens connected projects; `/tools` retains the supporting utilities. Guest device saves and exports work immediately. Private account synchronization uses the full Worker/D1 backend. The client-only Cloudflare preview has separate capabilities; source changes do not update a hosted deployment automatically.

## Connected project workspace

The root application connects briefs, requirements, deliverables, dependencies, evidence and scope changes for freelancers, students and professionals. Keep project records together, review the effects of revised scope, and export client-review, handover or portfolio drafts. Guest device storage and portable JSON exports are available; private account synchronization requires the full backend. See [project workspace capabilities and limitations](hosted-app/docs/PRODUCT_WORKSPACE.md).

## Profile and website capture

Open `/capture` to review a page snapshot. The [Chrome extension](extension/README.md) captures loaded profile/page text after a click, lets you redact it, and transfers it to your toolkit. Guest transfer, JSON snapshot import and local review work without an account. Private account saving, saved-review title sync and optional consented AI review require sign-in and their configured services. Download the developer ZIP from `/toolkit-capture-extension.zip` or `hosted-app/public/toolkit-capture-extension.zip`.

See [capture setup and AI configuration](hosted-app/docs/CAPTURE.md) and [validation](reports/2026-10-16/CAPTURE_VALIDATION.md). No provider is enabled automatically. The extension is not yet a Chrome Web Store release; real platform layouts need owner acceptance testing.

## Workflow development

The new `/workflows` page connects requirements and evidence notes to dependent tasks, checks capacity and deadlines, and compares a higher-effort scenario. It includes three audience examples, editable plans, device save/restore/delete, account snapshots and JSON import/export. The main directory now groups tools by Freelancers, Students and Professionals with subcategory filtering.

This is a deterministic one-person planning prototype, not an AI scheduler or the complete planned platform. Evidence references are user-provided and unverified. See the [research](reports/2026-10-16/RESEARCH.md), [architecture](reports/2026-10-16/ARCHITECTURE.md), [roadmap](reports/2026-10-16/ROADMAP.md) and [validation record](reports/2026-10-16/VALIDATION.md). Public deployment still requires the documented [hosting gates](hosted-app/deployment/README.md).

## Current milestone

Implemented: three audience workflows; editable requirements and acceptance checks; evidence-gated delivery states; dependency-aware effort and capacity planning; recorded scope baselines and downstream change impact; client-review, portfolio and handover Markdown; multiple device projects; portable JSON; and private account storage with revision conflicts. Page capture and supporting utilities remain available alongside projects. **Shared capacity** on the project overview now compares selected projects against one availability pool, with start-day alignment, time-off overrides, private scenario snapshots and exports. It uses numbered planning days; dated calendars remain future work.

The production build and 85 automated checks passed during local release verification, followed by browser acceptance of the guest workflow and an isolated Worker/D1 account round trip. These are local validation results, not proof of a public deployment or the complete research roadmap. AI review still requires operator configuration; live platform analytics, billing, tax/currency feeds and wider integrations remain open work. See [capabilities, limits and verification](hosted-app/docs/PRODUCT_WORKSPACE.md).

## Run

For the current application, use Node 24 and pnpm 11.25.0:

```sh
cd hosted-app
pnpm install --frozen-lockfile --ignore-scripts
npm run dev
```

Open the loopback address printed by the dev server (port 5173 by default). Account services need the configured local database and schema; guest project workflows remain usable without signing in. See [hosting prerequisites](hosted-app/deployment/README.md) before deploying the full backend.

The original Python starter is retained for reference. It requires Python 3.10+ and no third-party runtime dependencies:

    python server.py

The starter opens at http://127.0.0.1:8000 and does not contain the current connected project workspace. Device saves in both applications are browser-local and unencrypted; export a backup before switching origins or clearing browser storage.

## Test

    python -m unittest discover -s tests -v

## Architecture and roadmap

See docs/BLUEPRINT.md. Contributors should implement small complete tools and report validation honestly. Read CONTRIBUTING.md and SECURITY.md.

## Repository

Source: https://github.com/technicalzx/professional-toolkit

Licensed under the [MIT License](LICENSE). Dependencies and bundled third-party code retain their own licenses and notices. Contributions are welcome through reviewed pull requests; see [CONTRIBUTING.md](CONTRIBUTING.md), [community expectations](CODE_OF_CONDUCT.md), and [security reporting](SECURITY.md).

## Contributor checks

The standard-library starter and the hosted application have separate checks:

```sh
python -m unittest discover -s tests -v
cd hosted-app
pnpm install --frozen-lockfile --ignore-scripts
node --test "tests/*.test.mjs"
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Use Node 24 and pnpm 11.25.0, matching the package manager recorded in the hosted app. Keep local runtime state, private records and credentials out of Git. GitHub Actions checks the starter tests, hosted behavior, types and production build on pull requests. A passing source build does not establish a production security or hosting-capacity review.

See the [dependency security review](hosted-app/docs/DEPENDENCY-SECURITY.md) for the
patched framework versions and the remaining upstream advisory in development
tooling. CI also checks production dependencies for high/critical advisories.
