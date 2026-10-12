# Professional Toolkit

**Current review release: v0.2.** The upgraded React/TypeScript application and URL importer are in [hosted-app](hosted-app/). See the [upgrade roadmap](hosted-app/docs/UPGRADE_PLAN.md) and [validation record](hosted-app/docs/VALIDATION.md).

Review site: https://professional-toolkit-review.honestcove32.chatgpt.site (owner-private).

The root Python app below is retained as the original local starter. The hosted application is the current review experience.

An open-source workspace for freelancers, careers, personal branding and practical professional calculations, based on the owner's product brief.

## Current milestone

Working local development application: manually supplied LinkedIn/Upwork/Fiverr completeness audits, fee-aware freelance pricing, marks percentage, weighted GPA, tool search, favorites, saved result history, JSON export, copy, reset, dark mode and browser-data deletion.

This is the first implementation milestone, not the complete production SaaS described in the brief. No account authentication, live platform analytics, tax tables, currency feed, generative AI, billing or image processing is active. Profile scores explicitly measure supplied-field presence only.

## Run

Python 3.10+; no third-party runtime dependencies.

    python server.py

Open http://127.0.0.1:8000 . Keep this development server on loopback. Do not expose it publicly. Inputs are processed by your local Python process; saved results use browser localStorage and are not encrypted. Avoid saving sensitive profiles on shared devices.

## Test

    python -m unittest discover -s tests -v

## Architecture and roadmap

See docs/BLUEPRINT.md. Contributors should implement small complete tools and report validation honestly. Read CONTRIBUTING.md and SECURITY.md.

## Repository

Source: https://github.com/ycgiio/professional-toolkit

The repository has no license yet; the owner should choose one before inviting reuse.
