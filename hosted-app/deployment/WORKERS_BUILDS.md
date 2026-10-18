# Cloudflare Workers Builds

The application and its pinned package manager/Wrangler dependencies live in `hosted-app/`, not the repository root. Configure the `professional-toolkit` **Worker** under **Settings > Builds**. Its live address is `https://professional-toolkit.abihurairahansari.workers.dev`. The separate `professional-toolkit.pages.dev` Pages project has its own builds and settings; a successful Pages check does not verify the Worker backend.

## Production uploads and branch Previews

Production builds upload reviewable versions and leave live traffic on the last explicitly approved deployment. Branch builds deploy a separate **Worker Preview** with its own database binding. In the dashboard, **Production** and **Previews Base** save their build settings independently. Verify an existing branch's actual trigger as well: a saved Base screenshot does not verify the commands on that trigger.

| Setting | Production | Previews Base and `feature/extension-downloads` |
| --- | --- | --- |
| Root directory | `hosted-app` | `hosted-app` |
| Build command | `pnpm run build:cloudflare` | `pnpm run build:cloudflare` |
| Deploy / Preview command | `pnpm exec wrangler versions upload --config dist/server/wrangler.json` | `pnpm run deploy:preview` |
| Build variable `NODE_VERSION` | `24` | `24` |
| Build variable `PNPM_VERSION` | `11.25.0` | `11.25.0` |
| Build variable `TOOLKIT_PREVIEW_DATABASE_ID` | Leave unset | `857997b1-ddc7-499a-b4ec-4519b2860437` |

Keep the production branch set to `main` and enable builds for preview branches. Save build variables under **Builds > Variables and secrets** for the intended target; runtime variables at the top of Settings do not configure the build environment. The repository script `deploy:preview` runs `wrangler preview --config dist/server/wrangler.json` using the pinned project dependency. Do not use an unpinned `npx` fallback or change the production command to deploy automatically.

The build helper loads public deployment defaults from `deployment/live.json`, while allowing explicit authorized overrides. It verifies the generated production Worker name, D1 binding, account and AI configuration. When `TOOLKIT_PREVIEW_DATABASE_ID` is supplied, it also writes a `previews` block with the separate D1 database, explicit model variables, AI binding and operational logging with automatic invocation logs disabled. The helper rejects invalid/placeholder Preview IDs and IDs matching either the recorded or selected production database. Without that variable it preserves the ordinary production configuration. The build does not deploy, migrate data or invoke AI. Upload/deploy the generated `dist/server/wrangler.json`, not the source as a static website.

Assets and compatibility settings remain at the top level. Preview D1/AI/variables must be declared explicitly under `previews`; dashboard bindings alone do not replace the generated Wrangler configuration. Production routes, cron triggers, queue consumers and service bindings are not copied into the Preview block. See [Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/).

## Preview data and release boundary

The dedicated `professional-toolkit-preview` D1 database is `857997b1-ddc7-499a-b4ec-4519b2860437` in account `260e7e381c392d5ffe0946eb3ac10fc5`. It was created empty and initialized once with the existing 11-statement schema in `drizzle/0000_swift_wendigo.sql`. Production remains `professional-toolkit`, UUID `718dfe49-da4b-4c24-871f-ceabe8a2d59f`; its data was not copied or migrated for this repair. Do not rerun initial CREATE statements over either initialized database. Future changes require reviewed additive migrations applied to the exact database bound by that environment before deployment.

This isolates Preview data from production. Any additional Preview configured with the same Preview UUID shares that database; it does not receive automatic per-branch row isolation. Keep acceptance accounts uniquely identified and remove only their fixtures. The shared AI binding uses the configured Cloudflare service; its consent and attempt limits still apply, and an AI request can consume account usage. Do not inspect real user records or invoke inference merely to check the build. See [resources and isolation](https://developers.cloudflare.com/workers/previews/resources/).

Production `versions upload` does not move live traffic. A production Version URL still uses its configured production resources; it is not the isolated branch Preview above. For an explicitly owner-approved production release, promote the reviewed version through Cloudflare or use the separately verified `pnpm exec wrangler deploy --config dist/server/wrangler.json` from `hosted-app`. A passing branch build or PR merge does not authorize a future production release.

## Observed failures and compatibility decision

On 18 October 2026, build `103794e1-0336-4853-9db3-3e5ad7050f9c` ran at `/`, detected no project dependencies, and executed `npx wrangler preview`. It fetched an unpinned newer Wrangler and failed because its command requires a `previews` block. Adding only `previews: {}` would not build the nested application or configure its required backend bindings.

After the owner saved the displayed Production and Previews Base values, the 04:28 UTC retry still executed the old command. Successful Builds API reads established this state before the branch-trigger repair:

| Build target | Worker tag (`external_script_id`) | Trigger UUID | Observed configuration before repair |
| --- | --- | --- | --- |
| Production | `a581290d8ab84930958fcf00f37234f5` | `f67ca543-f9af-4d96-80db-bd154b3cea89` | Branch `main`; root `hosted-app`; build `pnpm run build:cloudflare`; version upload |
| Existing extension Preview | `c7bc5119087b4453ac057227575ad9a0` | `a6f5ea39-21cc-460c-9f9c-7046c2636800` | Only `feature/extension-downloads`; root `/`; empty build command; `npx wrangler preview`; last modified at 03:10 UTC |

The failed snapshot and current branch trigger agreed. Correcting that trigger and its Node/pnpm variables allowed build `4022da9e-2da1-4816-8510-abf744ded568` on commit `46b48ba4f6b7911c6e3db6f7c8add96a365b0474` to install dependencies and complete all application build stages. Its subsequent version upload under pinned Wrangler 4.92.0 failed the CI target guard: `The name in your wrangler.json file (professional-toolkit) must match the name of your Worker.` The job targets a separate branch Preview, while that old version-upload workflow verifies the production Worker identity. Do not unset `WRANGLER_CI_MATCH_TAG`, rename production or bypass the guard to hide this failure.

The adopted repair uses the supported Worker Previews command and pinned Wrangler **4.135.0**, the documented minimum version. A newer global installation does not replace the project dependency. The explicit Preview bindings and separate D1 above make this a complete backend Preview rather than a URL with missing bindings. Compilation success is only the observed intermediate result; the updated branch must still pass its Cloudflare build, exact-head GitHub checks and synthetic browser acceptance before this repair is declared complete. See [Worker Previews prerequisites](https://developers.cloudflare.com/workers/previews/get-started/).

The official [Cloudflare Workers SDK](https://github.com/cloudflare/workers-sdk) supplies the CLI; the installed 4.135.0 package declares `MIT OR Apache-2.0`. This change upgrades the existing development dependency and adapts its supported configuration; it copies no third-party implementation into application source. Preserve upstream package license notices. The pinned release satisfies the repository's seven-day minimum release age without an exception. Its upstream CLI internally depends on Miniflare `5.20260918.0-alpha`, while the existing Vite plugin retains its own older runtime dependency. Future upgrades need lockfile review, dependency audit, full build and Worker/D1 integration verification; a version bump alone does not prove compatibility. This repair changes no subscription or billing plan and makes no claim about unlimited Preview or AI capacity.

## Base settings and existing branch triggers

Previews Base provides starting settings for new Previews. Runtime secrets have their own documented inheritance rules. For build configuration, the connected Cloudflare API schema explicitly exposes `PATCH /accounts/{account_id}/builds/workers/{script_tag}?patch_existing_previews=false`: the query parameter defaults to `false`. Setting it to `true` applies a `previews_base_config` patch to **every existing Preview** as well as Base. Keep it false when updating Base for future branches, then repair only the selected existing branch trigger. Preserve other branches' configuration, repository connection, build token and unrelated variables.

Read Base and selected branch settings back independently before starting another build. The branch's Wrangler configuration supplies its Preview runtime bindings. Do not recreate the Worker, remove the Git connection, replace a working database or ask the owner to repeatedly enter already confirmed settings. An accepted configuration update or retry is not a successful build.

## Connected account and API diagnosis

Both connected Cloudflare MCP providers now reach account `260e7e381c392d5ffe0946eb3ac10fc5`, and Builds API reads/writes have succeeded. Earlier Wrangler OAuth CI requests returned 403, and an earlier plugin connection exposed a different account. Those historical failures do not describe the current MCP access or justify another reconnection/screenshot loop.

Use connected MCP `workers-ci.read` / `workers-ci.write` and `workers-scripts.read` access for CI diagnosis. Cloudflare calls the corresponding custom user-token permission **Workers Builds Configuration: Edit**. The existing deployment build token and a credential for managing Builds are different; neither belongs in chat, repository files or reports.

1. `GET /accounts/{account_id}/workers/scripts` identifies the production Worker's immutable `tag`; its name alone is not a Builds identifier.
2. `GET /accounts/{account_id}/builds/builds/{build_uuid}` identifies the failed build's `trigger.trigger_uuid`, `trigger.external_script_id` and executed `build_trigger_metadata`. A branch Preview can have a different tag from production.
3. `GET /accounts/{account_id}/builds/workers/{external_script_id}/triggers` verifies that actual target's commands, root, branch rules and repository connection. The existing Preview can also be identified through `/workers/workers/{worker_id}/previews/{preview_id}`.
4. Update Base through `/builds/workers/{production_script_tag}` with a partial `previews_base_config` patch and `patch_existing_previews=false`. Separately `PATCH /accounts/{account_id}/builds/triggers/{trigger_uuid}` with only the intended branch's `root_directory`, `build_command` and `deploy_command`. Its preview command is named `deploy_command` in the API. Manage the three public build variables from the table through that trigger's `/environment_variables` endpoint, preserving other keys and never printing secrets.
5. Read both settings back. Let the next meaningful branch commit trigger a build, or `POST /accounts/{account_id}/builds/triggers/{trigger_uuid}/builds` with its exact `branch` and `commit_hash` when no equivalent build is already running. Inspect sanitized build logs, final outcome and GitHub check for that exact SHA. Verify Preview URL/bindings and synthetic fixture cleanup before merge; leave production traffic unchanged.

If a corrected build reports a binding-permission problem, grant the existing build identity only the required access for the named Preview/Worker/database/AI binding. Do not replace the production database or weaken a CI target check.

## Retry a build, not a deployment

When UI controls are available, the failed **Workers Builds: professional-toolkit** check's **Details** link opens the exact build. Cloudflare documents retries using saved settings, so inspect the effective branch trigger if the new logs still show old commands.

- Open the `workers.dev` entry for this backend. The same-name `pages.dev` application has separate builds.
- The **Deployments** version list can show manual Wrangler uploads. **Rollback**, **Split versions** and **View logs** operate on versions; they do not retry Git builds. Do not roll back a working release to retry a build.
- Where offered, **Deployments > View build history**, the failed build's **Retry build**, or GitHub check **Details > Rerun** starts a build. These controls were absent from the owner's version-list screenshot; use the now-connected Builds API instead of repeating unavailable navigation steps.
- Re-running successful GitHub Actions jobs does not retry this separate Cloudflare check. An accepted API retry can also fail later; verify that the new build starts and finishes before reporting success.

Do not create empty commits, split trivial edits or change unrelated files to manufacture retries. Confirm the final published SHA, review findings, mergeability and required checks before merging.

Primary references: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Builds API and per-trigger settings](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/), [Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/), [Preview resources](https://developers.cloudflare.com/workers/previews/resources/), [Cloudflare API MCP OAuth scopes](https://github.com/cloudflare/mcp/blob/main/src/auth/derived-oauth-scopes.json), [build troubleshooting](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/), [retry Workers Builds from GitHub](https://developers.cloudflare.com/changelog/post/2025-03-17-rerun-build/), [production Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).
