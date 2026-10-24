import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { withSecurityHeaders } from "@repo/security/proxy";
import type { NextRequest } from "next/server";

export const config = {
  // Every route except static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
  ],
};

/**
 * Adds the locale prefix (/ar, /en) and refreshes the Supabase session
 * cookies (shared with The IDEA Pass) on every request. Access control
 * (signed in, staff, MFA) happens in the layouts and in every Server Action;
 * this only keeps the session fresh so Server Components read a valid token.
 */
export default async function proxy(request: NextRequest) {
  const response = internationalizationMiddleware(request);
  return withSecurityHeaders(await refreshSession(request, response));
}
