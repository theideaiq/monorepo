# Scribe's Journal

## 2025-05-18 - [Critical] Implicit Payment Routing Logic Points to Stub
Insight: The `PaymentFactory` in `@repo/payment-engine` contains implicit logic that routes transactions > 500,000 IQD to `ZainDirectAdapter`. However, `ZainDirectAdapter` is currently a stub that throws "Not Implemented". This means high-value transactions will silently fail (crash) in production without explicit documentation or handling.
Rule: Any "hybrid" or "smart" routing logic that depends on environment-specific or future-implemented features MUST be explicitly documented in the package README and the function's JSDoc to prevent false confidence.
