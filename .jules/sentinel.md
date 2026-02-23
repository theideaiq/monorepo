## 2025-05-24 - [XSS via JSON-LD Injection]
**Vulnerability:** JSON-LD structured data was injected into the DOM using `dangerouslySetInnerHTML` with `JSON.stringify`. This allowed attackers to break out of the script tag using `</script>` and inject malicious code.
**Learning:** `JSON.stringify` is not safe for use inside HTML script tags because it does not escape `<` and `>` characters, allowing script injection.
**Prevention:** Use the `safeJsonLdStringify` utility from `@repo/utils` which escapes HTML entities and line separators to unicode sequences when generating JSON-LD.
