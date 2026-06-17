## 2026-03-25 - Prevent JSON-LD XSS
**Vulnerability:** Unescaped '<' in dangerouslySetInnerHTML JSON-LD injection.
**Learning:** Malicious data can prematurely close script tags.
**Prevention:** Double-escape backslashes replacing '<' with '\\u003c'.
