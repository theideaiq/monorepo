## 2026-02-13 - Insecure Webhook Verification Stub

**Vulnerability:** The Wayl webhook implementation (`apps/web/src/app/api/webhooks/wayl/route.ts`) contained a stub for signature verification (`// Basic verification...`) without implementing it, allowing attackers to spoof payment success events.
**Learning:** Developers often leave security-critical verification logic as "TODOs" during rapid prototyping, which can accidentally persist into production.
**Prevention:** Never merge "security TODOs" into main branches. Implement full verification or use a "fail-safe" stub that rejects all requests until implemented. Use automated checks to flag missing security implementations in webhook handlers.
