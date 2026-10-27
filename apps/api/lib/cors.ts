import { env } from "@/env";

// Origins of the Capacitor webviews (iOS, Android). Written literally because
// `new URL("capacitor://localhost").origin` is "null" for custom schemes.
const NATIVE_ORIGINS = ["capacitor://localhost", "https://localhost"];

/**
 * The website's origins: NEXT_PUBLIC_WEB_URL and its www twin (or the bare
 * domain for a www URL), since the domain may serve either one.
 */
export const webOrigins = (): Set<string> => {
  const web = new URL(env.NEXT_PUBLIC_WEB_URL);
  const twin = new URL(web.origin);
  twin.hostname = web.hostname.startsWith("www.")
    ? web.hostname.slice("www.".length)
    : `www.${web.hostname}`;
  return new Set([web.origin, twin.origin]);
};

/** The IDEA Partners, Staff (its own host), the website and the apps. */
const allowedOrigins = () =>
  new Set([
    new URL(env.NEXT_PUBLIC_APP_URL).origin,
    ...(env.NEXT_PUBLIC_STAFF_URL
      ? [new URL(env.NEXT_PUBLIC_STAFF_URL).origin]
      : []),
    ...webOrigins(),
    ...NATIVE_ORIGINS,
  ]);

/** CORS headers for an allowed origin; empty for anything else. */
export const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get("origin");

  if (!(origin && allowedOrigins().has(origin))) {
    return {};
  }

  return {
    "Access-Control-Allow-Headers":
      "authorization, content-type, x-client-platform",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

export const preflight = (request: Request) =>
  new Response(null, { headers: corsHeaders(request), status: 204 });

/**
 * CORS headers for the website's public endpoints (contact form, status
 * badge): only the website's origins, no credentials and no
 * Authorization header.
 */
export const webCorsHeaders = (
  request: Request,
  methods = "POST, OPTIONS"
): Record<string, string> => {
  const origin = request.headers.get("origin");

  if (!(origin && webOrigins().has(origin))) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

export const webPreflight = (request: Request) =>
  new Response(null, { headers: webCorsHeaders(request), status: 204 });
