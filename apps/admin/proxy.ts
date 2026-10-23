import { keys } from "@repo/auth/keys";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { withSecurityHeaders } from "@repo/security/proxy";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export const config = {
  // Every route except static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
  ],
};

/**
 * Adds the locale prefix (/ar, /en) and refreshes the Supabase session
 * cookies on every request. Access control (signed in, staff, MFA) happens
 * in the layouts and in every Server Action; this only keeps the session
 * fresh so Server Components read a valid token.
 */
export default async function proxy(request: NextRequest) {
  const response = internationalizationMiddleware(request);
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    keys();

  if (NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createServerClient(
      NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              // Cookies set on the proxy response are also visible to
              // cookies() in the Server Components of this request.
              response.cookies.set(name, value, options);
            }
          },
        },
      }
    );

    // Refreshes an expired access token (and writes the new cookies).
    await supabase.auth.getUser();
  }

  return withSecurityHeaders(response);
}
