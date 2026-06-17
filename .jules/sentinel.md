## 2024-03-21 - Fix XSS Vulnerability in JSON-LD Injection
**Vulnerability:** Unescaped '<' characters in JSON-LD structured data injected via `dangerouslySetInnerHTML` could allow Cross-Site Scripting (XSS).
**Learning:** Even when `JSON.stringify` is used, malicious strings containing `</script>` can prematurely close the JSON-LD script tag and execute arbitrary JavaScript.
**Prevention:** Always escape the '<' character (e.g., using `.replace(/</g, '\\u003c')`) when injecting JSON-LD structured data via `dangerouslySetInnerHTML` and `JSON.stringify`.
