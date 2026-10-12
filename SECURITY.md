# Security

This is a local development application. The server binds to 127.0.0.1. It has no login or production user isolation. Browser saved data is plaintext and accessible to others using that browser profile.

Do not expose the server on a public interface or deploy it as a production SaaS. Do not submit client secrets or sensitive account data. Delete browser data using the app control after using a shared device.

Before production, implement authentication, authorization, CSRF protection, strict CSP, rate limits, upload isolation, secure secret storage, encrypted durable storage where appropriate, privacy consent and tested deletion/export.

Report suspected vulnerabilities privately to the repository owner; do not disclose credentials in public issues.
