# Scribe's Journal

This file contains critical learnings regarding the project's documentation standards and "Knowledge Graph".

## 2026-02-23 - [Hidden Logic/Broken Path]
Insight: The `PaymentFactory` in `@repo/payment-engine` contained undocumented logic that switched payment providers based on transaction amount (> 500,000 IQD). Worse, the destination provider (`ZainDirectAdapter`) was a stub that threw "Not Implemented" errors, creating a hidden trap for high-value transactions.
Rule: Any factory or routing logic that conditionally returns different implementations MUST be documented in the function's JSDoc/Docstring AND the package README. If a returned implementation is known to be broken or incomplete, it must be explicitly marked as such in the documentation to prevent runtime surprises.
