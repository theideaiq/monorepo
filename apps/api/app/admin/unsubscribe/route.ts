import { project } from "@repo/config";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { env } from "@/env";
import { verifyUnsubscribeToken } from "../_lib/unsubscribe";

/**
 * One-click unsubscribe from marketing email (RFC 8058).
 *
 * GET shows a confirmation page: link scanners and previews open links, so
 * opening one must not change anything. POST (the page's button, or the
 * mail client's one-click "List-Unsubscribe=One-Click") turns
 * `profiles.marketing_opt_in` off for the user the signed token names.
 */

const texts = {
  ar: {
    button: "إلغاء الاشتراك",
    confirm:
      "هل تريد التوقّف عن تلقّي الرسائل التسويقية من The IDEA عبر البريد الإلكتروني؟",
    done: "تم إلغاء اشتراكك. لن تصلك رسائل تسويقية بعد الآن، ويمكنك تفعيلها مجددًا من إعدادات حسابك.",
    invalid: "هذا الرابط غير صالح. يمكنك إيقاف الرسائل من إعدادات حسابك.",
    title: "إلغاء الاشتراك في الرسائل",
  },
  en: {
    button: "Unsubscribe",
    confirm: "Stop receiving marketing email from The IDEA?",
    done: "You're unsubscribed. You won't get marketing email any more; you can turn it back on in your account settings.",
    invalid:
      "This link isn't valid. You can turn off marketing email in your account settings.",
    title: "Unsubscribe",
  },
} as const;

type Lang = keyof typeof texts;

const langOf = (url: URL): Lang =>
  url.searchParams.get("lang") === "en" ? "en" : "ar";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const page = (lang: Lang, message: string, form?: string, status = 200) => {
  const t = texts[lang];
  const html = `<!doctype html>
<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#d81b60">
<title>${escapeHtml(t.title)} · ${escapeHtml(project.name)}</title>
<style>
body{margin:0;font-family:'Readex Pro',${lang === "ar" ? "Cairo,Tahoma" : "system-ui"},sans-serif;background:#fbf8ef;color:#0f1014}
main{max-width:28rem;margin:10vh auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
header{background:#d81b60;color:#fff;padding:16px 24px;font-weight:700;font-size:20px;letter-spacing:-0.01em}
section{padding:24px;line-height:1.6}
button{background:#d81b60;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;cursor:pointer}
</style>
</head>
<body><main><header>${escapeHtml(project.name)}</header><section>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(t.title)}</h1>
<p>${escapeHtml(message)}</p>${form ?? ""}
</section></main></body></html>`;
  return new Response(html, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
    },
    status,
  });
};

const secret = () => env.SUPABASE_SECRET_KEY ?? "";

export const GET = (request: Request) => {
  const url = new URL(request.url);
  const lang = langOf(url);
  const token = url.searchParams.get("token");

  if (!(secret() && verifyUnsubscribeToken(secret(), token))) {
    return page(lang, texts[lang].invalid, undefined, 400);
  }

  const action = `?token=${encodeURIComponent(token ?? "")}&lang=${lang}`;
  return page(
    lang,
    texts[lang].confirm,
    `<form method="post" action="${escapeHtml(action)}"><button type="submit">${escapeHtml(texts[lang].button)}</button></form>`
  );
};

export const POST = async (request: Request) => {
  const url = new URL(request.url);
  const lang = langOf(url);
  const userId = secret()
    ? verifyUnsubscribeToken(secret(), url.searchParams.get("token"))
    : null;

  if (!userId) {
    return page(lang, texts[lang].invalid, undefined, 400);
  }

  try {
    const { error } = await createAdminClient()
      .from("profiles")
      .update({ marketing_opt_in: false })
      .eq("id", userId);
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    log.error(`Unsubscribe failed for ${userId}: ${parseError(error)}`);
    return page(lang, texts[lang].invalid, undefined, 500);
  }

  log.info(`User ${userId} unsubscribed from marketing email`);
  return page(lang, texts[lang].done);
};
