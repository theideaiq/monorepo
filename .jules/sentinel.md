## 2025-01-20 - Open Redirect Vulnerability in Auth Callback
**Vulnerability:** User-supplied redirect parameter (`next`) in `apps/web/src/app/auth/callback/route.ts` was not validated before being used in `NextResponse.redirect`.
**Learning:** This could allow an attacker to craft a URL that redirects a user to a malicious site after logging in, potentially leading to phishing or credential theft.
**Prevention:** Always validate user-supplied redirect parameters to ensure they are safe relative paths (e.g., ensuring `next.startsWith('/') && !next.startsWith('//')`).
