# Cloudflare Workers Builds

The application and its pinned package manager/Wrangler dependencies live in `hosted-app/`, not the repository root. Configure this Worker under **Settings > Builds**. This is separate from the old guest-only Pages project.

## Review-only builds

Use these settings for automatic builds and version uploads, keeping production traffic on the last explicitly approved deployment:

| Setting | Value |
| --- | --- |
| Root directory | `hosted-app` |
| Build command | `pnpm run build:cloudflare` |
| Deploy command | `pnpm exec wrangler versions upload --config dist/server/wrangler.json` |
| Preview command | `pnpm exec wrangler versions upload --config dist/server/wrangler.json` |
| Build variable `NODE_VERSION` | `24` |
| Build variable `PNPM_VERSION` | `11.25.0` |

The build helper loads non-secret deployment defaults from `deployment/live.json`, while allowing explicit environment overrides for another authorized deployment. It requires a real database UUID and a configured Cloudflare model, then verifies the generated Worker's bindings before success. The build does not deploy, migrate data or invoke AI. The generated `dist/server/wrangler.json` is the configuration to upload; do not upload the source directory as a plain static website.

`versions upload` uploads a version without moving live traffic. A Version URL uses that version's configured resources, including the existing D1 database and AI binding; it is **not** an isolated test database. Test only disposable synthetic accounts and delete only their records. Do not test against users' saved content or silently invoke real inference. The existing application limits and consent checks still apply.

For an explicitly owner-approved production release, promote the reviewed version through Cloudflare or use the separately verified command `pnpm exec wrangler deploy --config dist/server/wrangler.json` from `hosted-app`. Do not change the automated command to `deploy` merely to make a pull-request check pass.

## Why the original build failed

On 18 October 2026, build `103794e1-0336-4853-9db3-3e5ad7050f9c` ran at `/`, detected no project package/dependencies, and executed `npx wrangler preview`. It fetched an unpinned newer Wrangler and failed because that beta command requires a `previews` block. Adding only `previews: {}` would not build this nested application or preserve its generated backend bindings. Use the pinned project build and explicit configuration above instead.

After saving settings, **Retry** the failed build or run a new build on the latest PR head. Cloudflare applies updated settings to a retry. Keep the existing build token in Cloudflare; do not paste it into chat or commit it. If the corrected build reports a binding-permission problem, grant that existing build identity only the access required for the named Worker/database/AI binding. Never create or replace the live database to repair a build.

The current Wrangler OAuth deployment session cannot read or change Workers CI configuration (the Builds API returned 403). The connected Cloudflare plugin targets a different account. Until the owner updates these settings or connects the correct account with Workers CI access, the agent can validate/deploy the application but cannot repair the dashboard configuration itself.

Primary references: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Version URLs and shared resources](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/). No new preview resources, dependencies, billing plan or permissions are required by the repository build helper.
