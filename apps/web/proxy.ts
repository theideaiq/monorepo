import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { withSecurityHeaders } from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every route except static assets, the PostHog ingest rewrites, the
  // sitemap and /.well-known (app links: apple-app-site-association,
  // assetlinks.json).
  matcher: [
    "/((?!_next/static|_next/image|ingest|\\.well-known|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

/**
 * Adds the locale prefix (/ar; none for English), keeps the shared session cookie of
 * The IDEA Pass fresh (so its pages and Server Actions read a valid token)
 * and adds the security headers (Nosecone). The site holds no secrets: its
 * forms and privileged steps go to apps/api. Access control stays in the
 * pages, the Server Actions and Row Level Security.
 */
export default async function proxy(request: NextRequest) {
  const response = internationalizationMiddleware(request);
  return withSecurityHeaders(await refreshSession(request, response));
}
