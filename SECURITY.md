# Security and vulnerability reporting

The root Python server is a loopback development starter without account authentication; its browser storage is plaintext. Keep it on 127.0.0.1 and do not expose it as a production service.

The newer hosted-app has first-party accounts, sessions, one-use recovery and owner-scoped reports. See hosted-app/docs/AUTHENTICATION.md for the implemented controls and remaining maturity gates. Public page importing has bounded inputs and destination checks, but controlled/pinned egress and a production security review remain necessary. The owner-private review hosting boundary must not be widened merely because the source becomes public.

Do not submit credentials, sensitive client information or private targets to this preview. Keep .env files, local databases and runtime state outside Git. Source visibility and a passing CI suite do not certify operational security.

Report a suspected vulnerability privately using GitHub's private vulnerability reporting feature when the repository owner has enabled it. Otherwise establish a verified private channel with the maintainer before sending sensitive details. No monitored email address or response-time guarantee is claimed. Do not open a public issue containing exploit details, credentials or personal data.

For a fix, use an isolated synthetic reproduction; verify legitimate behavior and unauthorized/invalid requests. Document affected versions, data impact, mitigation and remaining limitations. Production release additionally requires reviewed authentication, abuse controls, egress, backup restoration, secret management, monitoring and account export/deletion coverage.
