## 2026-02-28 - Prevent Open Redirect in Auth Callback
**Vulnerability:** The `apps/web/src/app/auth/callback/route.ts` file used the user-supplied `next` search parameter directly in a `NextResponse.redirect()` call without validation.
**Learning:** In Next.js App Router, unvalidated query parameters used for redirects can be exploited by attackers to redirect users to malicious external sites (e.g., using protocol-relative URLs like `//malicious.com`).
**Prevention:** Always validate user-provided redirect URLs. Ensure they are safe relative paths by checking if they start with a single forward slash (`/`) and do not start with a double forward slash (`//`). Fall back to a safe default path if validation fails.
