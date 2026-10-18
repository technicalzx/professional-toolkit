# Research evidence register

Access date: 16 October 2026. Sources are primary project/vendor documentation unless explicitly identified otherwise. Observations describe the material inspected; recommendations and gap hypotheses are in RESEARCH.md. No third-party application was executed for competitive analysis.

## Repository evidence

Source checkout: `targets/professional-toolkit` in the investigation workspace. GitHub baseline: [d5a546b](https://github.com/technicalzx/professional-toolkit/tree/d5a546b51f84d3d8e9aa50b01eac8d68898e2e95).

| ID | Path at baseline | Observation |
| --- | --- | --- |
| R1 | `README.md`, `LICENSE`, `CONTRIBUTING.md` | Public MIT project and contribution checks |
| R2 | `hosted-app/app/page.tsx` | Seven tools and private account report UI |
| R3 | `hosted-app/lib/toolkit/analysis.mjs` | Deterministic analysis, literal matching and templates |
| R4 | `hosted-app/db/schema.ts`, `lib/auth/service.mjs`, `app/api/reports/route.ts` | User-scoped persistence implementation |
| R5 | `hosted-app/deployment/README.md` | Direct deployment gates and prior CPU measurements; those measurements were not repeated in this review |
| R6 | `hosted-app/package.json`, `vite.config.ts`, `.github/workflows/ci.yml` | Stack and contributor checks |

The supplied document's extracted reference text remains outside the public repository, at the investigation workspace's `reports/prompt-reference.txt`. It is requirement context, not independent market evidence.

## External sources

| ID | Source | Observed fact / scope |
| --- | --- | --- |
| S1 | [Midday](https://github.com/midday-ai/midday) | Business tool integration and monorepo/service structure; README license wording warrants separate review before reuse |
| S2 | [Solidtime](https://github.com/solidtime-io/solidtime) | Clients/projects/tasks, rates and organizations; API specification in repository |
| S3 | [Plane](https://github.com/makeplane/plane) | Issues, cycles, roadmaps and reusable application/package structure |
| S4 | [Twenty](https://github.com/twentyhq/twenty) | CRM objects/fields/views and application SDK |
| S5 | [Reactive Resume](https://github.com/reactive-resume/reactive-resume) | Structured resume/letter/application workflows and optional AI providers |
| S6 | [OpenResume](https://www.open-resume.com/) | Resume builder/parser and browser-local storage |
| S7 | [Anki](https://github.com/ankitects/anki) | Spaced repetition application |
| S8 | [Zotero](https://github.com/zotero/zotero) | Research source collection, organization and citation |
| S9 | [Bonsai projects](https://www.hellobonsai.com/projects) | Vendor-described scope-to-project and connected billing workflow |
| S10 | [Motion task manager](https://www.usemotion.com/features/ai-task-manager) | Vendor-described dependency/deadline scheduling |
| S11 | [Reclaim priorities](https://help.reclaim.ai/en/articles/8291694-how-reclaim-uses-priorities-to-intelligently-plan-your-workweek) | Priority and availability-based scheduling |
| S12 | [Cloudflare Workflows event wait](https://developers.cloudflare.com/workflows/examples/wait-for-event/) | Durable wait for user approval/event |
| S13 | [Cloudflare Queues delivery](https://developers.cloudflare.com/queues/reference/delivery-guarantees/) | At-least-once delivery and deduplication requirement |
| S14 | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) | Plan-dependent storage limits and single-threaded database execution |
| S15 | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Current pricing/CPU budgeting reference; no account plan inferred |
| S16 | [GitHub Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) | Sponsorship mechanism; eligibility/funding not verified for this project |

Remote HEAD identifiers recorded with `git ls-remote` during research (the web README views may have separate crawl timing; these IDs are not asserted to pin every web excerpt):

- Reactive Resume: `7d272a0d818f32c31e4a72f905d34dd373396eb4`
- Midday: `51587319f26a0ffaa9dfccab1920373cb65689b7`
- Plane: `4e0e4038a176c335509b7d474f7cac4046b90e34`
- Solidtime: `b46f015754a19493418a3129dcfcf8890587c6a8`

## Cloudflare observation

Through the connected Cloudflare plugin, GET Worker-script and D1-database lists returned success. The connected account had one listed Worker and two listed D1 databases. No resource contents or credentials were needed for the product study, and no resources were created, changed or deleted. Subscription tier, binding ownership and production readiness remain unknown. These counts are inventory observations, not evidence that Professional Toolkit is deployed there.

## Search scope and unknowns

Queries covered open-source freelancer workspaces, time tracking, CRM/project structures, student/career tools and commercial scheduling/scope workflows. Selection was purposive, not an exhaustive or ranked census. No interviews or market survey were conducted. No claim is made that the proposed combination is unique worldwide. See RESEARCH.md for explicit falsification tests.
