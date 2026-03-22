## 2024-05-24 - Server-Rendered JSON-LD and XSS Prevention
**Learning:** Client-side JSON-LD components (using `'use client'`) can be invisible to crawlers that don't execute JavaScript, and injecting unescaped JSON strings via `dangerouslySetInnerHTML` poses an XSS risk.
**Action:** Always omit `'use client'` for JSON-LD components where possible (making them Server Components), and always escape the `<` character using `.replace(/</g, '\u003c')` when calling `JSON.stringify`.
