## 2026-04-10 - Inject JSON-LD Schema Safely
**Learning:** When injecting JSON-LD schema using dangerouslySetInnerHTML, stringified JSON containing HTML tags could lead to Cross-Site Scripting (XSS).
**Action:** Always sanitize the injected JSON-LD string by escaping the less-than symbol to prevent potential injection via fields like product descriptions.
