## 2024-04-06 - Initial

## 2024-04-06 - Missing Product Structured Data
**Learning:** Core business entities (Products) lacked explicit Schema.org JSON-LD structured data in their Next.js page views, which prevents search engines from properly extracting Rich Snippet metadata like price, availability, and ratings.
**Action:** Always inject specific Schema.org JSON-LD components (e.g., `ProductJsonLd`) directly into the Next.js page views of core business entities to ensure correct metadata extraction, while properly escaping HTML using `dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}` to prevent XSS vulnerabilities.
