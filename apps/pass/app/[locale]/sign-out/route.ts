import { safeReturnTo } from "@repo/auth/pass";
import { createClient } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";

interface Context {
  readonly params: Promise<{ locale: string }>;
}

/** Navigations from The IDEA's own sites (another subdomain or port). */
const OWN_SITES = new Set(["same-origin", "same-site"]);

/**
 * `/{locale}/sign-out?return_to=…`: signs out on this device (the shared
 * cookie, so every site) and goes on to `return_to` (allowed hosts only),
 * else to the Pass sign-in. Links from other sites can't sign anyone out:
 * without a same-site `Sec-Fetch-Site` header the visitor lands on "Your
 * Pass", which has its own sign-out button.
 */
export const GET = async (request: NextRequest, { params }: Context) => {
  const { locale } = await params;
  const { origin } = request.nextUrl;

  if (!OWN_SITES.has(request.headers.get("sec-fetch-site") ?? "")) {
    return NextResponse.redirect(new URL(`/${locale}`, origin));
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const target = safeReturnTo(
    request.nextUrl.searchParams.get("return_to"),
    null
  );
  return NextResponse.redirect(target ?? new URL(`/${locale}/sign-in`, origin));
};
