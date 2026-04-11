## 2025-04-11 - Prevent XSS in JSON-LD `<script>` Injection
**Vulnerability:** Cross-Site Scripting (XSS) risk via unsanitized JSON data injected directly into `<script type="application/ld+json">` tags using `dangerouslySetInnerHTML`.
**Learning:** `JSON.stringify` does not escape HTML characters by default. If malicious or untrusted input contains HTML tags (especially `</script>`), an attacker could break out of the script tag and inject arbitrary scripts into the page.
**Prevention:** Always sanitize JSON output inside `<script>` blocks by replacing the literal `<` character with its Unicode escape sequence `\u003c` (e.g., `JSON.stringify(data).replace(/</g, '\\u003c')`).
