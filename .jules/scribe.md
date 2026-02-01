# Scribe's Journal

## 2026-01-25 - Payment Engine Routing Logic
Insight: The payment engine contains implicit business logic that routes transactions based on amount thresholds (> 500,000 IQD -> Zain Direct), which was only visible in the factory code.
Rule: Any business logic that branches execution flow based on hardcoded thresholds must be documented in the package README and the Scribe Journal.
