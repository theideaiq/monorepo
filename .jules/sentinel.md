## 2026-04-05 - XSS via unescaped JSON in script tags
**Vulnerability:** XSS vulnerability in JsonLd and BreadcrumbJsonLd due to JSON.stringify inside dangerouslySetInnerHTML in <script> tags not escaping < characters.
**Learning:** JSON.stringify does not escape HTML characters, making it unsafe to inject directly into <script> tags, especially when data contains dynamic URL segments.
**Prevention:** Always escape < by replacing it with \u003c when injecting JSON into <script type="application/ld+json"> using dangerouslySetInnerHTML.
