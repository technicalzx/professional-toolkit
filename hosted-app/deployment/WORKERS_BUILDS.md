# Cloudflare Workers Builds

The application and its pinned package manager/Wrangler dependencies live in `hosted-app/`, not the repository root. Configure the `professional-toolkit` **Worker** under **Settings > Builds**. Its live address is `https://professional-toolkit.abihurairahansari.workers.dev`. The separate `professional-toolkit.pages.dev` Pages project has its own builds and settings; a successful Pages check does not verify the Worker backend.

## Review-only builds

Use these settings for automatic builds and version uploads, keeping production traffic on the last explicitly approved deployment. In the dashboard, **Production** and **Previews Base** save their build configuration independently. Select each tab within the **Builds** section and save the corresponding values. Updating Production does not fix an unchanged Previews Base configuration.

| Setting | Production | Previews Base |
| --- | --- | --- |
| Root directory | `hosted-app` | `hosted-app` |
| Build command | `pnpm run build:cloudflare` | `pnpm run build:cloudflare` |
| Deploy / Preview command | `pnpm exec wrangler versions upload --config dist/server/wrangler.json` | `pnpm exec wrangler versions upload --config dist/server/wrangler.json` |
| Build variable `NODE_VERSION` | `24` | `24` |
| Build variable `PNPM_VERSION` | `11.25.0` | `11.25.0` |

Keep the production branch set to `main` and enable builds for preview branches. Add the two version variables under **Builds > Variables and secrets** in each tab; runtime variables at the top of Settings do not configure the build environment. Check the complete command, including `dist/server/wrangler.json`, even when the dashboard input clips its ending.

The build helper loads non-secret deployment defaults from `deployment/live.json`, while allowing explicit environment overrides for another authorized deployment. It requires a real database UUID and a configured Cloudflare model, then verifies the generated Worker's bindings before success. The build does not deploy, migrate data or invoke AI. The generated `dist/server/wrangler.json` is the configuration to upload; do not upload the source directory as a plain static website.

`versions upload` uploads a version without moving live traffic. A Version URL uses that version's configured resources, including the existing D1 database and AI binding; it is **not** an isolated test database. Test only disposable synthetic accounts and delete only their records. Do not test against users' saved content or silently invoke real inference. The existing application limits and consent checks still apply.

For an explicitly owner-approved production release, promote the reviewed version through Cloudflare or use the separately verified command `pnpm exec wrangler deploy --config dist/server/wrangler.json` from `hosted-app`. Do not change the automated command to `deploy` merely to make a pull-request check pass.

## Why the original build failed

On 18 October 2026, build `103794e1-0336-4853-9db3-3e5ad7050f9c` ran at `/`, detected no project package/dependencies, and executed `npx wrangler preview`. It fetched an unpinned newer Wrangler and failed because that beta command requires a `previews` block. Adding only `previews: {}` would not build this nested application or preserve its generated backend bindings. Use the pinned project build and explicit configuration above instead.

## Retry a build, not a deployment

After saving both configurations, retry the failed **Workers Builds: professional-toolkit** check or let the next meaningful branch commit start a fresh build. Cloudflare applies the saved settings to retries and new builds.

- The applications list has separate Worker and Pages entries with the same name. Open the entry whose address ends in `workers.dev` for this backend.
- The **Deployments** version list can show manual Wrangler uploads. Its **Rollback**, **Split versions** and **View logs** actions operate on versions; they do not retry Git builds. On 18 October 2026, the owner's screenshot showed this version list without a build-history link. Do not repeatedly direct users to an absent control or roll back a working release to retry a build.
- When available, **Deployments > View build history** opens Git build history. Use the failed build's **Retry build** action or its **Build Details** page. The failed check's **Details** link in GitHub also provides the exact Cloudflare build URL.
- Cloudflare also documents a GitHub route: open the pull request's failed **Workers Builds: professional-toolkit** check, select **Details**, then **Rerun** where offered. An authenticated REST retry can still be rejected; verify that a new build actually starts before reporting success. Re-running successful GitHub Actions jobs does not retry this separate Cloudflare check.

If these controls are unavailable, a new useful, reviewed commit on the connected branch triggers another build. Do not create empty commits, change unrelated files or bypass the failing check to manufacture a retry. Confirm the new check's head SHA and outcome before merging.

Keep the existing build token in Cloudflare; do not paste it into chat or commit it. If the corrected build reports a binding-permission problem, grant that existing build identity only the access required for the named Worker/database/AI binding. Never create or replace the live database to repair a build.

The current Wrangler OAuth deployment session cannot read or change Workers CI configuration (the Builds API returned 403). The connected Cloudflare plugin targets a different account. Until the owner updates these settings or connects the correct account with Workers CI access, the agent can validate/deploy the application but cannot repair the dashboard configuration itself.

Primary references: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [troubleshooting and dashboard retries](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/), [retry Workers Builds from GitHub](https://developers.cloudflare.com/changelog/post/2025-03-17-rerun-build/), [Version URLs and shared resources](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). No new preview resources, dependencies, billing plan or permissions are required by the repository build helper.
