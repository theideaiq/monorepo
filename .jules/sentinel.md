## 2024-03-13 - Fix XSS in JSON-LD Injection
**Vulnerability:** XSS vulnerability through improperly escaped JSON-LD structured data inside a `<script>` tag via `dangerouslySetInnerHTML`.
**Learning:** Using `JSON.stringify` alone is insufficient to prevent XSS when placed inside a `<script>` tag, as it does not escape characters like `<`.
**Prevention:** Use `JSON.stringify(data).replace(/</g, '\u003c')` when injecting JSON-LD data into a page with `dangerouslySetInnerHTML`.
