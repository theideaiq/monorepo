## 2026-02-19 - JSON-LD XSS Injection
**Vulnerability:** User-controlled data (e.g., URL segments) injected into JSON-LD script blocks via `dangerouslySetInnerHTML` was vulnerable to XSS. An attacker could inject `</script><script>alert(1)</script>` to break out of the script tag and execute arbitrary code.
**Learning:** `JSON.stringify` does not escape the `<` character by default. When JSON is embedded inside an HTML `<script>` tag, the sequence `</script>` terminates the script block regardless of whether it appears inside a JSON string.
**Prevention:** Use a safe stringification utility (like `safeJsonLdStringify`) that replaces `<` with `\u003c` when embedding JSON in HTML.
