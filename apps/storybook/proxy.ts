import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { type NextRequest, NextResponse } from "next/server";
import { checkAccess, type GateEnv, localeFrom, passUrl } from "./lib/gate";

/**
 * The IDEA Design (design.theideaiq.com) is for staff: every request (the
 * stories, the manager and the static files Storybook builds into public/)
 * passes the check in lib/gate.ts first. Next.js runs this proxy on Vercel
 * for every path, so there is no vendor login in front of it.
 */
export const config = { matcher: "/:path*" };

const ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const UNSAFE = /[&<>"']/g;
const escapeHtml = (value: string) =>
  value.replace(UNSAFE, (character) => ESCAPES[character] ?? character);

/** A plain bilingual 403 page: Arabic first, then English. */
const forbiddenPage = (switchUrl: string) => {
  const section = (
    lang: "ar" | "en",
    copy: typeof en.design.forbidden
  ) => `<section lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<h1>${escapeHtml(copy.title)}</h1>
<p>${escapeHtml(copy.body)}</p>
<p><a href="${escapeHtml(switchUrl)}">${escapeHtml(copy.switch)}</a></p>
</section>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>The IDEA Design</title></head><body style="font-family:Cairo,Poppins,system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.7;color:#0f1014;background:#ffffff">${section("ar", ar.design.forbidden)}<hr style="border:0;border-top:1px solid #e4e4e7;margin:2rem 0">${section("en", en.design.forbidden)}</body></html>`;
};

// The IDEA Pass lives in The IDEA Spark (apps/app).
const defaultPassUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://spark.theideaiq.com";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!(supabaseUrl && publishableKey)) {
    // Fail closed.
    return new NextResponse("Not configured", { status: 503 });
  }
  const env: GateEnv = {
    passUrl: process.env.NEXT_PUBLIC_APP_URL || defaultPassUrl(),
    publishableKey,
    supabaseUrl,
  };
  const result = await checkAccess(request, env);
  if (result.kind === "allow") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  if (result.kind === "redirect") {
    return NextResponse.redirect(result.location, 302);
  }
  // Signing out through Pass and back lets the visitor try another account.
  const switchUrl = passUrl(env, "sign-out", request.url, localeFrom(request));
  return new NextResponse(forbiddenPage(switchUrl), {
    headers: {
      "Cache-Control": "private, no-store",
      "content-type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
    status: 403,
  });
}
