## 2024-04-07 - XSS Vulnerability in JSON-LD Injection
**Vulnerability:** XSS vulnerability in Next.js components injecting JSON-LD via `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}` where untrusted data within `data` could potentially break out of the `<script>` tag.
**Learning:** React does not automatically escape `<script>` block content. If a JSON value contains `</script><script>alert(1)</script>`, it terminates the script tag early and allows arbitrary code execution.
**Prevention:** When injecting JSON-LD, always sanitize the JSON string by replacing `<` with its unicode equivalent: `JSON.stringify(data).replace(/</g, '\\u003c')`.
