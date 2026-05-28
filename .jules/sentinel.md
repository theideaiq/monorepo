## 2024-04-02 - XSS in React Email Templates
**Vulnerability:** Found unescaped user input passed to `dangerouslySetInnerHTML` in the `BrandedTemplate.tsx` React Email component, presenting a Cross-Site Scripting (XSS) risk.
**Learning:** Even internal or admin-facing email templates generated server-side must sanitize dynamic content before injecting it as raw HTML, especially since email clients execute limited HTML/CSS but still parse tags. The assumption that `body_html` from the database is safe is flawed.
**Prevention:** Always use a sanitization library like `xss` or `dompurify` before passing dynamic content to `dangerouslySetInnerHTML`, even in server-rendered templates.
