import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { catalogLookupCspSources } from "@repo/security/csp";
import { noseconeOptionsWith, withSecurityHeaders } from "@repo/security/proxy";
import { type NextRequest, NextResponse } from "next/server";
import { designResponse } from "@/lib/design-proxy";
import {
  isDesignPath,
  isStaffHost,
  isStaffPath,
  localeSegment,
  toStaffPath,
} from "@/lib/hosts";

export const config = {
  // Every route except static assets, the PostHog ingest rewrites and
  // /.well-known (app links: apple-app-site-association, assetlinks.json),
  // plus every file of the design site, which only staff may load.
  matcher: [
    "/((?!_next/static|_next/image|ingest|\\.well-known|favicon.ico|robots.txt|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    "/design/:path*",
  ],
};

// Staff also look up product covers from the browser.
const staffOptions = noseconeOptionsWith(catalogLookupCspSources);

/** The localized 404 (the catch-all page), for paths on the wrong host. */
const notFound = (request: NextRequest) =>
  NextResponse.rewrite(
    new URL(`${localeSegment(request.nextUrl.pathname)}/404`, request.url)
  );

/**
 * One app on two hosts (lib/hosts.ts). On the staff host every path is a
 * Staff page (`/orders` serves `app/[locale]/staff/orders`) and `/design`
 * is the design site; on the partners host only partner pages answer.
 * Then: the locale prefix (/ar; none for English), the shared session
 * cookie kept fresh (so Server Components and Server Actions read a valid
 * token) and the security headers (Nosecone). Access control stays in the
 * pages, the Server Actions and Row Level Security.
 */
export default async function proxy(request: NextRequest) {
  const { host, pathname } = request.nextUrl;
  const staff = isStaffHost(host);

  if (isDesignPath(pathname)) {
    return staff ? designResponse(request) : notFound(request);
  }
  if (isStaffPath(pathname)) {
    // The staff tree is only reached through the staff host's own paths.
    return notFound(request);
  }

  let response = internationalizationMiddleware(request);
  if (staff && !response.headers.has("location")) {
    const target = new URL(
      response.headers.get("x-middleware-rewrite") ?? request.url
    );
    target.pathname = toStaffPath(target.pathname);
    const rewritten = NextResponse.rewrite(target);
    for (const cookie of response.cookies.getAll()) {
      rewritten.cookies.set(cookie);
    }
    response.headers.forEach((value, name) => {
      if (!(name.startsWith("x-middleware-") || name === "set-cookie")) {
        rewritten.headers.set(name, value);
      }
    });
    response = rewritten;
  }

  return withSecurityHeaders(
    await refreshSession(request, response),
    staff ? staffOptions : undefined
  );
}
