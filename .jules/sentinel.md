## 2026-04-06 - JSON-LD XSS Vulnerability
**Vulnerability:** Unescaped JSON-LD structured data injected via `dangerouslySetInnerHTML` in `JsonLd.tsx` and `BreadcrumbJsonLd.tsx`.
**Learning:** React safely escapes most content, but when using `dangerouslySetInnerHTML` to inject raw JSON-LD schema (e.g., `JSON.stringify(data)`), any user input within that data containing `</script>` or other HTML tags could potentially break out of the script block and execute malicious code, leading to Cross-Site Scripting (XSS).
**Prevention:** Always escape the `<` character when stringifying JSON for use in script tags using `.replace(/</g, '\u003c')`.
