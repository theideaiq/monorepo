import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { withSecurityHeaders } from "@repo/security/proxy";
import { createNEMO } from "@rescale/nemo";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";

export const config = {
  // matcher tells Next.js which routes to run the middleware on. This runs the
  // middleware on all routes except for static assets and Posthog ingest
  matcher: [
    "/((?!_next/static|_next/image|ingest|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

const composedMiddleware = createNEMO(
  {},
  {
    before: [internationalizationMiddleware],
  }
);

// The website has no signed-in area and holds no secrets: its forms post to
// apps/api, which runs the Arcjet guard and the rate limits.
export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent
) {
  const response =
    (await composedMiddleware(request, event)) ?? NextResponse.next();

  return withSecurityHeaders(response);
}
