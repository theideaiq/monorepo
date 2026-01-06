## 2024-05-23 - Hardcoded Webhook Secret in Helper Library

**Vulnerability:** A hardcoded `webhookSecret` ("secure_secret_123") was found in `lib/wayl.ts`, which is used for generating payment links.
**Learning:** Developers often hardcode secrets during development for convenience and forget to replace them with environment variables before production. Comments indicating "move this to env vars" are a clear sign of technical debt that became a security risk.
**Prevention:** Use environment variables from the start, even for development values (e.g., use a dummy value in `.env.local` instead of hardcoding in the source).
