## 2025-05-24 - Webhook Signature Verification and Raw Body

**Vulnerability:** The payment webhook endpoint in `apps/web` was parsing the JSON body before verification. Signature verification requires the exact raw body (byte-for-byte), as parsing and re-serializing JSON can alter whitespace or key order, invalidating the HMAC signature.
**Learning:** In Next.js App Router, `request.json()` consumes the body. To verify signatures, one must use `request.text()` to get the raw body string, use it for verification, and then `JSON.parse()` it for logic.
**Prevention:** Always read the raw body string first in webhook handlers that require signature verification. Use `timingSafeEqual` for comparing signatures to prevent timing attacks.
