## 2024-03-27 - Product JSON-LD Injection
**Learning:** Raw JSON-LD string injection in Next.js via dangerouslySetInnerHTML can open XSS vectors if product descriptions or names contain unescaped script tags (e.g., from untrusted sellers).
**Action:** Always escape HTML characters (specifically < to \u003c) when stringifying JSON-LD structured data payload to prevent cross-site scripting vulnerabilities.
