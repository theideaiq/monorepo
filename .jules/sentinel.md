## 2025-02-27 - [Webhook Signature Verification]
**Vulnerability:** Wayl payment webhooks were accepted without verifying the cryptographic signature, allowing attackers to fake payment confirmations.
**Learning:** External integrations relying on webhooks must always verify the signature using raw request body to prevent payload tampering. JSON parsing before verification destroys the original byte sequence needed for HMAC check.
**Prevention:** Implement `verifyWebhook` in payment adapters using `crypto.timingSafeEqual` and `createHmac`. Always pass `request.text()` (raw body) to verification logic before parsing JSON.
