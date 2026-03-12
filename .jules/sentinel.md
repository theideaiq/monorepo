## 2025-03-12 - Prevent XSS in JSON-LD Injection
**Vulnerability:** Unescaped JSON-LD injected directly into `<script>` tags via `dangerouslySetInnerHTML`.
**Learning:** `JSON.stringify` does not escape HTML characters like `<` and `>`, which allows malicious users to close the `<script>` tag and inject arbitrary scripts if dynamic input (like URLs or search terms) is included in the JSON-LD payload.
**Prevention:** Always safely escape HTML characters when injecting JSON-LD data into a `<script>` tag by replacing `<` with its unicode equivalent (e.g., `JSON.stringify(jsonLd).replace(/</g, '\u003c')`), and prepend the `dangerouslySetInnerHTML` property with the Biome ignore comment `// biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for JSON-LD`.
