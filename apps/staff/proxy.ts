import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { catalogLookupCspSources } from "@repo/security/csp";
import { noseconeOptionsWith, withSecurityHeaders } from "@repo/security/proxy";
import type { NextRequest } from "next/server";
import { designResponse, isDesignPath } from "@/lib/design-proxy";

export const config = {
  // Every route except static assets and robots.txt, plus every file of the
  // design site (public/design), which only staff may load.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    "/design/:path*",
  ],
};

// Staff also look up product covers from the browser.
const staffOptions = noseconeOptionsWith(catalogLookupCspSources);

/**
 * The design site goes through its own staff check (lib/design-gate.ts).
 * Everything else: the locale prefix (/ar; none for English), the shared
 * session cookie kept fresh (so Server Components and Server Actions read a
 * valid token) and the security headers (Nosecone). Access control stays in
 * the pages (staff with an aal2 session), the Server Actions and Row Level
 * Security.
 */
export default async function proxy(request: NextRequest) {
  if (isDesignPath(request.nextUrl.pathname)) {
    return designResponse(request);
  }
  const response = internationalizationMiddleware(request);
  return withSecurityHeaders(
    await refreshSession(request, response),
    staffOptions
  );
}
