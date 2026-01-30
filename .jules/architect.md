# Architect's Journal

## 2025-02-18 - Extract Payment Provider Constants
Smell: Hardcoded string literals ('wayl', 'zain-direct') and magic numbers (500000) scattered across factory, adapters, and consumer services.
Standard: Use `PAYMENT_PROVIDERS` constant object and named business constants (e.g., `ZAIN_DIRECT_THRESHOLD`) in `@repo/payment-engine` to ensure consistency and type safety.
