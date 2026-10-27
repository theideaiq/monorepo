import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { type NextRequest, NextResponse } from "next/server";
import { checkAccess, type GateEnv, localeFrom, passUrl } from "./design-gate";

/**
 * The IDEA Design at staff.theideaiq.com/design: the static Storybook build
 * in public/design, served only to staff with an aal2 session
 * (lib/design-gate.ts). `/design` itself serves its index page.
 */

const ESCAPES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const UNSAFE = /[&<>"']/g;
const DESIGN_INDEX = /^\/design\/?$/;

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
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>The IDEA Design</title></head><body style="font-family:'Readex Pro',Cairo,system-ui,sans-serif;max-width:34rem;margin:4rem auto;padding:0 1rem;line-height:1.7;color:#0f1014;background:#ffffff">${section("ar", ar.design.forbidden)}<hr style="border:0;border-top:1px solid #e4e4e7;margin:2rem 0">${section("en", en.design.forbidden)}</body></html>`;
};

// The IDEA Pass lives on the website (apps/web).
const defaultPassUrl = () =>
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://theideaiq.com";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export const designResponse = async (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!(supabaseUrl && publishableKey)) {
    // Fail closed.
    return new NextResponse("Not configured", { status: 503 });
  }
  const env: GateEnv = {
    passUrl: process.env.NEXT_PUBLIC_WEB_URL || defaultPassUrl(),
    publishableKey,
    supabaseUrl,
  };
  const result = await checkAccess(request, env);
  if (result.kind === "allow") {
    const response = DESIGN_INDEX.test(request.nextUrl.pathname)
      ? NextResponse.rewrite(new URL("/design/index.html", request.url))
      : NextResponse.next();
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }
  if (result.kind === "redirect") {
    return NextResponse.redirect(result.location, 302);
  }
  // Signing out through Pass and back lets the visitor try another Pass.
  const switchUrl = passUrl(env, "sign-out", request.url, localeFrom(request));
  return new NextResponse(forbiddenPage(switchUrl), {
    headers: { ...PRIVATE_HEADERS, "content-type": "text/html; charset=utf-8" },
    status: 403,
  });
};
