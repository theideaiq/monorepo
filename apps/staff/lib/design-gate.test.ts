import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn((_table: string) => ({ select }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims }, from }),
}));

const { accessTokenFrom, checkAccess, localeFrom } = await import(
  "./design-gate"
);

const SUPABASE = "https://abcdefghijklmnop.supabase.co";
const env = {
  passUrl: "https://theideaiq.com",
  publishableKey: "sb_publishable_x",
  supabaseUrl: SUPABASE,
};
const NOW = 1_800_000_000_000;
const PAGE = "https://staff.theideaiq.com/design/?path=/docs/intro";

const PLUS = /\+/g;
const SLASH = /\//g;
const PADDING = /[=]+$/;

const cookieFor = (session: object, chunked = false) => {
  const encoded = btoa(JSON.stringify(session))
    .replace(PLUS, "-")
    .replace(SLASH, "_")
    .replace(PADDING, "");
  const value = `base64-${encoded}`;
  const key = "sb-abcdefghijklmnop-auth-token";
  if (!chunked) {
    return `${key}=${value}`;
  }
  const half = Math.ceil(value.length / 2);
  return `${key}.0=${value.slice(0, half)}; other=1; ${key}.1=${value.slice(half)}`;
};

const request = (cookie?: string, headers: Record<string, string> = {}) =>
  new Request(PAGE, {
    headers: cookie ? { cookie, ...headers } : headers,
  });

const fresh = { access_token: "jwt", expires_at: NOW / 1000 + 3600 };

const signedIn = (claims: Record<string, unknown>) =>
  getClaims.mockResolvedValue({
    data: { claims: { sub: "u1", ...claims } },
    error: null,
  });

const locationOf = (result: Awaited<ReturnType<typeof checkAccess>>) =>
  new URL(result.kind === "redirect" ? result.location : "about:blank");

describe("The IDEA Design gate", () => {
  beforeEach(() => {
    getClaims.mockReset();
    maybeSingle.mockReset();
    from.mockClear();
    eq.mockClear();
  });

  test("reads whole, chunked and plain session cookies", () => {
    expect(accessTokenFrom(cookieFor(fresh), SUPABASE)?.token).toBe("jwt");
    expect(accessTokenFrom(cookieFor(fresh, true), SUPABASE)?.token).toBe(
      "jwt"
    );
    const plain = `sb-abcdefghijklmnop-auth-token=${encodeURIComponent(JSON.stringify(fresh))}`;
    expect(accessTokenFrom(plain, SUPABASE)?.token).toBe("jwt");
    expect(accessTokenFrom("x=1", SUPABASE)).toBeNull();
    expect(
      accessTokenFrom("sb-abcdefghijklmnop-auth-token=base64-!!", SUPABASE)
    ).toBeNull();
  });

  test("sends visitors without a session to Pass sign-in and back", async () => {
    const result = await checkAccess(request(), env, NOW);
    expect(result).toMatchObject({ kind: "redirect", reason: "sign-in" });
    const location = locationOf(result);
    // English, the default language, has no prefix.
    expect(location.origin + location.pathname).toBe(
      "https://theideaiq.com/sign-in"
    );
    const arabic = locationOf(
      await checkAccess(request("NEXT_LOCALE=ar"), env, NOW)
    );
    expect(arabic.pathname).toBe("/ar/sign-in");
    expect(location.searchParams.get("return_to")).toBe(PAGE);
  });

  test("keeps the visitor's language for Pass", () => {
    expect(localeFrom(request("NEXT_LOCALE=en"))).toBe("en");
    expect(
      localeFrom(request(undefined, { "accept-language": "en-US,en;q=0.9" }))
    ).toBe("en");
    expect(localeFrom(request(undefined, { "accept-language": "fr" }))).toBe(
      "en"
    );
    expect(
      localeFrom(request(undefined, { "accept-language": "ar-IQ,ar;q=0.9" }))
    ).toBe("ar");
  });

  test("an expired session also goes to Pass, never refreshed here", async () => {
    const stale = { access_token: "jwt", expires_at: NOW / 1000 - 10 };
    const result = await checkAccess(request(cookieFor(stale)), env, NOW);
    expect(result).toMatchObject({ kind: "redirect", reason: "sign-in" });
    expect(getClaims).not.toHaveBeenCalled();
  });

  test("a token Supabase rejects goes to sign-in", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("bad jwt") });
    const result = await checkAccess(request(cookieFor(fresh)), env, NOW);
    expect(result).toMatchObject({ kind: "redirect", reason: "sign-in" });
  });

  test("staff with an authenticator-app session get in", async () => {
    signedIn({ aal: "aal2" });
    maybeSingle.mockResolvedValue({ data: { role: "editor" }, error: null });
    expect((await checkAccess(request(cookieFor(fresh)), env, NOW)).kind).toBe(
      "allow"
    );
    expect(from).toHaveBeenCalledWith("staff");
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
  });

  test("aal1 staff are sent to Pass to finish two-step sign-in", async () => {
    signedIn({ aal: "aal1" });
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    const result = await checkAccess(
      request(`${cookieFor(fresh)}; NEXT_LOCALE=en`),
      env,
      NOW
    );
    expect(result).toMatchObject({ kind: "redirect", reason: "mfa" });
    const location = locationOf(result);
    expect(location.pathname).toBe("/mfa");
    expect(location.searchParams.get("return_to")).toBe(PAGE);
  });

  test("customers are refused, even at aal2", async () => {
    signedIn({ aal: "aal2" });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await checkAccess(request(cookieFor(fresh)), env, NOW)).kind).toBe(
      "forbidden"
    );
  });

  test("a database error fails closed", async () => {
    signedIn({ aal: "aal2" });
    maybeSingle.mockResolvedValue({ data: null, error: { message: "down" } });
    expect((await checkAccess(request(cookieFor(fresh)), env, NOW)).kind).toBe(
      "forbidden"
    );
  });

  test("third-party app tokens never open it", async () => {
    signedIn({ aal: "aal2", client_id: "app" });
    expect((await checkAccess(request(cookieFor(fresh)), env, NOW)).kind).toBe(
      "forbidden"
    );
    expect(from).not.toHaveBeenCalled();
  });
});
