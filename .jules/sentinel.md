## 2024-05-24 - Prevent XSS in JSON-LD injection
**Vulnerability:** Unescaped `<` characters in JSON stringified data injected into the DOM via `dangerouslySetInnerHTML`.
**Learning:** Even though JSON structure itself is safe, when `<script>` tags enclose the JSON-LD, an unescaped `</script>` string inside the JSON will prematurely close the script tag, exposing the remainder of the payload as HTML (XSS breakout).
**Prevention:** Always escape `<` as `\u003c` when injecting JSON into script tags.
