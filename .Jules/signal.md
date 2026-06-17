## 2025-03-24 - [Missing Product Schema.org Data]
**Learning:** Product pages did not have the essential Schema.org Product structured data which powers Google Shopping and Rich Snippets.
**Action:** When adding or verifying SEO structures for ecommerce or individual entity pages, ensure JSON-LD components are injected cleanly via the `dangerouslySetInnerHTML` trick properly escaping `<` symbols to prevent XSS.
