import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { catalogLookupCspSources } from "@repo/security/csp";
import { noseconeOptionsWith, withSecurityHeaders } from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every route except static assets, the PostHog ingest rewrites and
  // /.well-known (app links: apple-app-site-association, assetlinks.json).
  matcher: [
    "/((?!_next/static|_next/image|ingest|\\.well-known|favicon.ico|robots.txt|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
  ],
};

// The back office also looks up product covers from the browser.
// English paths have no locale prefix (/staff), the others do (/ar/staff).
const ADMIN_PATH = /^(?:\/(?:ar|en))?\/staff(?:\/|$)/;
const adminOptions = noseconeOptionsWith(catalogLookupCspSources);

/**
 * Adds the locale prefix (/ar; none for English), keeps the shared session cookie fresh
 * (so Server Components and Server Actions read a valid token) and adds the
 * security headers (Nosecone). Access control stays in the pages, the
 * Server Actions and Row Level Security.
 */
export default async function proxy(request: NextRequest) {
  const response = internationalizationMiddleware(request);
  return withSecurityHeaders(
    await refreshSession(request, response),
    ADMIN_PATH.test(request.nextUrl.pathname) ? adminOptions : undefined
  );
}
