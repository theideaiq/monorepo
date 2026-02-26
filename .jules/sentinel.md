## 2026-02-26 - [Webhook Verification via Callback]
**Vulnerability:** Payment webhook handlers were blindly trusting payload data (`status`, `referenceId`) without signature verification, allowing potential spoofing.
**Learning:** External libraries (like `@repo/wayl`) may lack signature verification utilities. Trusting unverified payloads is a critical risk.
**Prevention:** When signature verification is unavailable or unreliable, verify webhook events by calling the provider's API directly (`callback verification`) using the resource ID from the payload to fetch the authoritative status.
