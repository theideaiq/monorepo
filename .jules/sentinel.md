## 2024-05-18 - JSON-LD XSS Vulnerability
**Vulnerability:** XSS vulnerability through premature script termination in JSON-LD injection (e.g., `</script><script>alert(1)</script>`).
**Learning:** `dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}` allows an attacker to inject arbitrary scripts if `jsonLd` contains user-controlled data, as `JSON.stringify` does not escape HTML tags.
**Prevention:** Always sanitize JSON-LD strings by replacing `<` with its unicode equivalent: `JSON.stringify(jsonLd).replace(/</g, '\\u003c')`.
