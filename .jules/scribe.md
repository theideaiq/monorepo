# Scribe's Journal

## 2026-02-24 - Undocumented Business Logic in Factories
Insight: The PaymentFactory contained hidden routing logic (switching to Zain for >500k IQD) that was completely undocumented, creating a "magic" behavior.
Rule: All factory or builder patterns containing conditional business logic must be explicitly documented in the package README.
