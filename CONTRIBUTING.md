# Contributing

Use focused branches and pull requests. Include the problem, resulting behavior, validation and remaining limitations. Test numerical boundaries and failure states. Do not fabricate AI, tax or platform data.

AI-assisted work is welcome when disclosed, reviewed and validated. The human contributor owns correctness and must understand the change. Never send secrets or private client data to models.

Run python -m unittest discover -s tests -v before submission. Do not commit environments, credentials, browser data or personal documents.


## Workflows and review

Start with a reproducible bug report or a feature request with an acceptance example. See README.md for both starter and hosted-app test commands. Use temporary synthetic fixtures, preserve existing data, and update source contracts and docs alongside behavior. Additive database migrations must be tested without rewriting an already applied migration.

Never load-test a shared service, commit a real provider key, or add a live integration without establishing its permissions and configuration. Browser tests should use disposable local accounts and avoid the owner's existing records.

Your contributions are provided under this repository's MIT license. Preserve dependencies' copyright and license notices. Follow CODE_OF_CONDUCT.md and report vulnerabilities through SECURITY.md rather than a public issue.
