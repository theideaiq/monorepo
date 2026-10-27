import { createClient } from "@supabase/supabase-js";

/**
 * The IDEA Design (Staff → /design) is for staff. Visitors bring the session cookie that
 * The IDEA Pass writes (shared across *.theideaiq.com through
 * NEXT_PUBLIC_AUTH_COOKIE_DOMAIN); the gate reads it, verifies the token with
 * Supabase (publishable key only) and asks the database, as that user,
 * whether they are on the staff list. Staff rights need an authenticator-app
 * session (aal2), so aal1 staff are sent to Pass to finish two-step sign-in.
 *
 * The gate never refreshes a session: refreshing here would spend the
 * browser's refresh token. An expired session goes to Pass, which refreshes
 * it and sends the visitor back.
 */

const BASE64_PREFIX = "base64-";
const DASH = /-/g;
const UNDERSCORE = /_/g;
const LOCALES = ["ar", "en"] as const;
// English, the website's default language, has no prefix in its URLs.
const DEFAULT_LOCALE = "en";

type Locale = (typeof LOCALES)[number];

export interface GateEnv {
  /** The IDEA Pass: the website (NEXT_PUBLIC_WEB_URL). */
  passUrl: string;
  publishableKey: string;
  supabaseUrl: string;
}

export type GateResult =
  | { kind: "allow" }
  | { kind: "redirect"; location: string; reason: "mfa" | "sign-in" }
  | { kind: "forbidden" };

const cookieMap = (header: string | null) => {
  const map = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      map.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
    }
  }
  return map;
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(DASH, "+").replace(UNDERSCORE, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** The access token from @supabase/ssr's cookie (chunked or whole). */
export const accessTokenFrom = (
  cookieHeader: string | null,
  supabaseUrl: string
): { expiresAt: number; token: string } | null => {
  const [ref] = new URL(supabaseUrl).hostname.split(".");
  const key = `sb-${ref}-auth-token`;
  const cookies = cookieMap(cookieHeader);
  let raw = cookies.get(key);
  if (!raw) {
    const chunks: string[] = [];
    for (let i = 0; cookies.has(`${key}.${i}`); i += 1) {
      chunks.push(cookies.get(`${key}.${i}`) ?? "");
    }
    raw = chunks.length > 0 ? chunks.join("") : undefined;
  }
  if (!raw) {
    return null;
  }
  try {
    const value = decodeURIComponent(raw);
    const json = value.startsWith(BASE64_PREFIX)
      ? decodeBase64Url(value.slice(BASE64_PREFIX.length))
      : value;
    const session = JSON.parse(json) as {
      access_token?: unknown;
      expires_at?: unknown;
    };
    if (typeof session.access_token !== "string") {
      return null;
    }
    return {
      expiresAt:
        typeof session.expires_at === "number" ? session.expires_at : 0,
      token: session.access_token,
    };
  } catch {
    return null;
  }
};

const isLocale = (value: string | undefined): value is Locale =>
  LOCALES.includes(value as Locale);

/** The visitor's language: next-intl's cookie, then the browser's. */
export const localeFrom = (request: Request): Locale => {
  const cookie = cookieMap(request.headers.get("cookie")).get("NEXT_LOCALE");
  if (isLocale(cookie)) {
    return cookie;
  }
  const preferred = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase());
  return preferred.find(isLocale) ?? DEFAULT_LOCALE;
};

/**
 * `${NEXT_PUBLIC_WEB_URL}/${path}?return_to=…` (`/ar/${path}` in Arabic; The
 * IDEA Pass, on the website), the same URL as
 * `passUrl` from @repo/auth/pass builds, but from the injected `GateEnv` so
 * the gate stays testable without process.env.
 */
export const passUrl = (
  env: GateEnv,
  path: "mfa" | "sign-in" | "sign-out",
  returnTo: string,
  locale: Locale
) => {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const location = new URL(`${prefix}/${path}`, env.passUrl);
  location.searchParams.set("return_to", returnTo);
  return location.toString();
};

const redirect = (
  env: GateEnv,
  request: Request,
  reason: "mfa" | "sign-in"
): GateResult => ({
  kind: "redirect",
  location: passUrl(env, reason, request.url, localeFrom(request)),
  reason,
});

export const checkAccess = async (
  request: Request,
  env: GateEnv,
  now = Date.now()
): Promise<GateResult> => {
  const session = accessTokenFrom(
    request.headers.get("cookie"),
    env.supabaseUrl
  );
  // A minute's margin, so the token does not expire mid-check.
  if (!session || session.expiresAt * 1000 < now + 60_000) {
    return redirect(env, request, "sign-in");
  }
  const supabase = createClient(env.supabaseUrl, env.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.token}` } },
  });
  const { data, error } = await supabase.auth.getClaims(session.token);
  if (error || !data) {
    return redirect(env, request, "sign-in");
  }
  const { claims } = data;
  if (typeof claims.client_id === "string" && claims.client_id) {
    // Tokens issued to third-party apps never open internal tools.
    return { kind: "forbidden" };
  }
  // Row Level Security lets every user read their own staff row, at any
  // assurance level; the staff rights themselves need aal2.
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (staffError || !staff) {
    return { kind: "forbidden" };
  }
  return claims.aal === "aal2"
    ? { kind: "allow" }
    : redirect(env, request, "mfa");
};
