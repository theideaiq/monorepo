## 2024-03-23 - Prevent XSS in JSON-LD Injection
**Vulnerability:** XSS breakout risk when injecting unescaped JSON strings into `<script>` tags using `dangerouslySetInnerHTML`.
**Learning:** `JSON.stringify` does not escape `<` characters, allowing attackers to close the script tag prematurely with `</script>` and execute arbitrary code.
**Prevention:** Always append `.replace(/</g, '\u003c')` when stringifying JSON for injection into HTML script tags.
