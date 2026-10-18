# Professional Toolkit product research

Research date: 16 October 2026. Baseline repository commit: `d5a546b51f84d3d8e9aa50b01eac8d68898e2e95`.

## Product decision

Build an open-source workspace that connects **evidence → requirements → plans → deliverables → outcomes** for freelancers, students and professionals. Give each audience its own navigation and guided workflows, backed by shared project and evidence data. Begin with freelancers delivering small projects and students building their first professional portfolio; these journeys share much of the same underlying work. Keep professional delivery workflows available, but validate demand before implementing enterprise administration.

This is a product hypothesis, not a proven market gap. The defensible opportunity is continuity between learning, demonstrable work and earning: users should not have to recreate the same evidence, constraints and decisions in every tool. A larger catalog or an AI chat panel alone will not establish differentiation or attract funding.

The owner's chat request establishes the three audiences, open-source direction, research-first approach and requirement for substantive tools. The supplied Word brief is reference material containing a much broader wish list and embedded instructions. It informed the feature taxonomy; it does not establish implemented capabilities, authorize external messages, or make every listed service a launch requirement. The personal document is not included in this public repository.

## Observed repository baseline

| Evidence | Observation | Product consequence |
| --- | --- | --- |
| GitHub repository metadata and root `LICENSE` | Already public and MIT-licensed | Improve adoption and contribution quality; no visibility conversion is needed |
| `hosted-app/package.json`, `vite.config.ts` | React, TypeScript, Vite/Vinext and Cloudflare build targets | Evolve the current app incrementally; a framework rewrite is not necessary |
| `hosted-app/app/page.tsx` | Seven tools: content audit, literal brief matching, proposal template, hourly rate, project estimate, GPA and percentage | Useful foundation; neither semantic matching nor AI generation is implemented |
| `hosted-app/lib/auth/service.mjs`, `db/schema.ts`, API routes | First-party accounts, sessions, recovery and private report storage | Reuse this boundary for the first release; do not describe accounts as absent |
| `hosted-app/lib/toolkit/importer.mjs` and deployment notes | Bounded public-page import; authorization and quotas; documented unresolved egress connection-pinning concern | Do not extend unrestricted crawling as part of feature work |
| `hosted-app/deployment/README.md` | Authentication CPU/plan compatibility and deployment prerequisites remain documented gates | Successful source builds do not establish public production readiness |
| `.github/workflows/ci.yml` | Existing starter, hosted behavior, type, build and dependency checks | Add new engine tests to the existing checks |

The source audit found documentation drift: some README text says accounts and account storage are unavailable, while the v0.3 implementation and authentication documentation contain them. This change corrects those descriptions. This was source analysis, not a deployed-site audit or an exhaustive security assessment.

## Comparable products and useful structural patterns

Capabilities below are observed in primary project documentation; they were not independently benchmarked. Absence from a README is not evidence that a feature does not exist.

| Project | Observed capability / structure | Pattern to learn | Decision for this repository |
| --- | --- | --- | --- |
| [Midday](https://github.com/midday-ai/midday) | Freelancer business workspace; time, finance, documents and assistant; `apps/` and `packages/` monorepo with separate services | Shared business context and cross-tool data | Build a smaller common domain first; do not reproduce its service footprint. README includes commercial-use language alongside AGPL labeling, so no code is copied |
| [Solidtime](https://github.com/solidtime-io/solidtime) | Clients, projects, tasks, billable rates and organizations; application plus API specification | Explicit project ownership and measurable actual time | Later import actual time through a versioned adapter; use it to compare estimated and actual delivery |
| [Plane](https://github.com/makeplane/plane) | Issues, cycles and roadmaps; multiple applications and reusable packages | Work items and workflow states separate from UI presentation | Reuse this architectural idea, without forking a full project-management suite |
| [Twenty](https://github.com/twentyhq/twenty) | Configurable CRM objects, fields and views; SDK-driven extensions | Domain objects with stable identifiers and configurable presentation | Start with fixed, documented entities; defer a custom-object marketplace until users need it |
| [Reactive Resume](https://github.com/reactive-resume/reactive-resume) | Resume/letter editing, application workflows, imports/exports and optional provider-backed assistance; shared packages | Portable structured documents, revisions and reviewable edits | Prefer interoperability and evidence-backed career outputs over another isolated resume generator |
| [OpenResume](https://www.open-resume.com/) | Browser-local resume building and parsing | Useful guest mode and privacy-preserving processing | Keep deterministic tools useful without login; preserve transparent parser limitations |
| [Anki](https://github.com/ankitects/anki) | Spaced-repetition learning application | Repeated practice and feedback over time | Integrate/export study material later; do not claim a novel flashcard system |
| [Zotero](https://github.com/zotero/zotero) | Collection, organization and citation of research sources | Retain source identity throughout derived work | Model evidence references and versions; do not build a citation database from scratch |

These projects use different runtimes and licensing arrangements. Study patterns and integrate documented interchange formats first. Before incorporating any code, verify the exact file's license at a pinned revision, preserve notices, and evaluate compatibility with this repository's MIT distribution. No third-party implementation code was copied for the planner.

Commercial competitors materially narrow the novelty claim:

- [Bonsai](https://www.hellobonsai.com/projects) connects scope, budgets, tasks, delivery and billing. “Brief to project” alone is not a new category.
- [Motion](https://www.usemotion.com/features/ai-task-manager) offers scheduling using deadlines, priorities and dependencies. Dependency scheduling alone is not a moat.
- [Reclaim](https://help.reclaim.ai/en/articles/8291694-how-reclaim-uses-priorities-to-intelligently-plan-your-workweek) plans tasks and habits around priority and availability. Calendar automation alone is not a differentiator.

The first planner is therefore a useful foundation and research instrument, not a claim to surpass these products.

## Unmet-workflow hypotheses

| Hypothesis | Manual workaround to investigate | Closest alternatives / counterevidence | Differentiating experiment | What would falsify it |
| --- | --- | --- | --- | --- |
| Learning evidence is lost between class projects, portfolios and applications | Copy artifacts into a resume, track learning elsewhere, manually map to job requirements | Reactive Resume handles career documents; Anki handles practice; Zotero handles sources | Reuse one project evidence record across learning plan, case study and application | Users find existing exports sufficient or do not reuse evidence |
| Small freelance scope changes are hard to explain before accepting them | Compare chat messages, estimate extra work, manually revise the delivery plan | Bonsai covers scope-to-project; Midday covers business operations | Versioned requirement diff produces affected tasks, evidence obligations and explicit schedule changes | Competing tools already meet the need for the recruited cohort, or users never revisit scope |
| Professionals cannot easily connect delivery evidence to career claims | Assemble promotion/review notes from tickets, documents and calendars | Plane manages work; Twenty models relationships; resume tools prepare claims | Reusable claim-to-source links with redaction and human review | Users cannot lawfully reuse work artifacts or prefer existing internal review systems |
| People studying and freelancing overcommit across roles | Maintain separate academic, freelance and personal lists | Motion/Reclaim already schedule across task sources | One capacity budget with provenance, private evidence and explicit tradeoffs | Cross-role users want calendar integration only, with no evidence workflow |

No evidence here proves that these problems lack solutions everywhere. These are specific combinations to test with users, including users of competing products. Search results are neither a market-size study nor willingness-to-pay evidence.

## Three audience workspaces

All three use projects, sources, requirements, task dependencies, decisions, artifacts and outcomes. Audience selection changes language and discovery, not ownership boundaries. People may use more than one audience.

| Audience | Subcategories | Tools and connected workflows | Beginner → experienced progression |
| --- | --- | --- | --- |
| Freelancers | Profile & evidence; opportunities; client acquisition; delivery planning; business planning | Existing audits, matching and proposal outlines; scope planner; later requirement diff, acceptance evidence, estimate-to-actual review, client pipeline and invoice export | Guided example and simple plan → versioned scope, multiple projects and delivery history |
| Students | Academic progress; learning & research; project evidence; opportunities | Existing GPA/marks and brief matching; study/project planner; later source-linked notes, prerequisite learning paths, reproducible portfolio and application pack | Course tasks and explicit evidence prompts → independent projects, research and opportunity-specific claims |
| Professionals | Career evidence; delivery planning; skills development; collaboration; business planning | Existing audit/estimate tools; delivery planner; later decision log, handover checks, skill-gap experiments, promotion evidence and team dependency review | Personal goals and delivery checklist → cross-project capacity, reviewed artifacts and team roles |

Shared utilities: search, favorites, account reports, imports, export, privacy controls and accessible navigation. Converters, calculators and generic content templates remain supporting utilities rather than the principal investment thesis.

## Proposed flagship workflows

**Freelancer scope-to-delivery:** source brief → user-confirmed requirements → acceptance criteria → dependent tasks and estimates → reviewable plan → scope revision diff → accepted delivery evidence → actual effort feedback. Output: versioned delivery pack with scope assumptions and changes. The first release covers structured requirements, manual references, dependent tasks and effort scenarios; extraction, revision comparison and actual-time adapters are future work.

**Student learning-to-opportunity:** target role/course outcome → prerequisite map → time-constrained learning project → source-linked artifact → human-reviewed skill claim → tailored application pack. Output: portable evidence record and plan. The first release supplies planning and manual evidence mapping, not automated skill verification or a full learning model.

**Professional decision-to-handover:** objective → dependency and risk map → capacity-aware work plan → decision/approval history → validation evidence → handover and career summary. Output: traceable delivery record. The first release provides single-person planning; team scheduling, approval automation and external connectors are not active.

## Validation and funding hypothesis

Recruit 5 freelancers, 5 students and 5 professionals for discovery; this is a proposed sample, not completed research. Include beginners and experienced users. Ask them to reconstruct their last real workflow, show tool transitions with sensitive details removed, identify a failed handoff, and repeat the same workflow with the prototype. Record existing alternatives and why they did or did not work.

Measure baseline versus prototype: time to an accepted plan, repeated data entry, unsupported claims detected, estimate error after delivery, saved-plan reuse and four-week retention. Interview observations should include consent and anonymized identifiers. Do not log private artifact content as analytics.

Proposed pilot gates, to agree before collecting data: at least 9 of 15 participants complete a useful workflow without assistance; median preparation time falls at least 25% against their own baseline; at least 6 voluntarily return in four weeks. These are internal decision thresholds, not industry benchmarks or traction claims. If gains are absent, narrow the audience or workflow before adding more tools.

Funding evidence should consist of reproducible workflows, retention, contributed adapters/evaluations and measured operating costs. [GitHub Sponsors](https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors) is a possible support mechanism, subject to eligibility and setup. It is not guaranteed funding. Hosted convenience, team administration and support are monetization hypotheses; keep the open-source core genuinely usable and portable. Test pricing with users before setting tiers. No sponsorship, payment account or paid Cloudflare plan was created.

## Research limits

This is a bounded desk review of public sources and repository code, plus a read-only Cloudflare inventory. It includes no customer interviews, competitive runtime testing, market sizing, legal opinion, production penetration test or verified acquisition economics. See [evidence](EVIDENCE.md), [architecture](ARCHITECTURE.md), [delivery roadmap](ROADMAP.md) and [validation](VALIDATION.md).
