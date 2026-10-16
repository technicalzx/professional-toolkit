# Dependency security review — 2026-10-16

The publication review found a critical Next.js advisory and vulnerabilities in
the framework's development dependency tree. The source now pins Next.js and its
ESLint configuration to 16.3.8, Vite to 8.0.16, and React/React DOM/server DOM to
19.2.8. Targeted pnpm overrides select patched transitive dependencies, including
Sharp 0.35.5. The seven-day package release age policy and disabled installation
scripts remain in place. The lockfile records the exact resulting graph.

After these changes, `pnpm audit --prod --audit-level=high` reports no known
production dependency vulnerabilities. CI runs that command. The full
`pnpm audit` still reports one high advisory in development tooling:

| Advisory | Dependency paths | Current assessment | Review deadline |
| --- | --- | --- | --- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | ESLint configuration and Vinext build plugins → fast-glob → micromatch → braces 3.0.3 | Upstream lists no patched version. Deeply nested glob patterns can terminate the development process. These paths are development dependencies; keep development servers on loopback and review repository/build configuration before running contributed code. This is a documented residual risk, not a claim that the advisory is fixed or that development tools are safe for hostile patterns. | 2026-10-23 |

Do not dismiss the alert as fixed or suppress the full audit. Recheck the
advisory and upgrade/remove the affected build tooling when an upstream fix is
available. Reassess before any production release. The source is a review
application; a passing build or dependency audit is not a security certification.

Run both views when reviewing a dependency change:

```sh
pnpm audit --prod --audit-level=high
pnpm audit
```
