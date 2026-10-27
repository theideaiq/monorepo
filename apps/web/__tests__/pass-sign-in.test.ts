import { describe, expect, it } from "vitest";
import { askedFor, parseAuthorizeRequest, returnUrl } from "@/lib/pass-sign-in";

const base = {
  client_id: "pass_00000000000000000000sal1",
  code_challenge: "a".repeat(43),
  code_challenge_method: "S256",
  nonce: "n-1",
  redirect_uri: "https://auibsal.org/auth/pass",
  response_type: "code",
  scope: "openid email profile student",
  state: "s-1",
  ui_locales: "ar-IQ en",
};
const parse = (overrides: Record<string, string | null> = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== null) {
      params.set(key, value);
    }
  }
  return parseAuthorizeRequest(params);
};

describe("the authorization request", () => {
  it("reads a valid request", () => {
    const parsed = parse();
    expect(parsed?.problem).toBeNull();
    expect(parsed?.request).toMatchObject({
      nonce: "n-1",
      scopes: ["openid", "email", "profile", "student"],
      state: "s-1",
      uiLocale: "ar",
    });
  });

  it("needs a client and a return address", () => {
    expect(parse({ client_id: null })).toBeNull();
    expect(parse({ redirect_uri: null })).toBeNull();
  });

  it("names what's wrong otherwise", () => {
    expect(parse({ response_type: "token" })?.problem).toBe(
      "unsupported_response_type"
    );
    expect(parse({ scope: "email" })?.problem).toBe("invalid_scope");
    expect(parse({ scope: "openid orders" })?.problem).toBe("invalid_scope");
    expect(parse({ code_challenge_method: "plain" })?.problem).toBe(
      "invalid_request"
    );
    expect(parse({ code_challenge: "short" })?.problem).toBe("invalid_request");
  });

  it("lists what's asked in a fixed order", () => {
    expect(askedFor(["openid", "student", "email", "profile"])).toEqual([
      "profile",
      "email",
      "student",
    ]);
  });
});

describe("the return address", () => {
  const request = {
    redirectUri: "https://auibsal.org/auth/pass?x=1",
    state: "s-1",
  };
  const issuer = "https://api.theideaiq.com/oidc";

  it("carries the code, the state and the issuer", () => {
    const url = new URL(returnUrl(request, issuer, { code: "c0de" }));
    expect(url.origin + url.pathname).toBe("https://auibsal.org/auth/pass");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      code: "c0de",
      iss: issuer,
      state: "s-1",
      x: "1",
    });
  });

  it("or the error", () => {
    const url = new URL(
      returnUrl({ ...request, state: null }, issuer, { error: "access_denied" })
    );
    expect(url.searchParams.get("error")).toBe("access_denied");
    expect(url.searchParams.has("state")).toBe(false);
  });
});
