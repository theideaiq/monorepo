import { safeNextPath } from "@repo/internationalization/app-paths";
import { describe, expect, test, vi } from "vitest";
import { deepLinkPath } from "@/components/native-bridge";
import { ApiError, callApi } from "@/lib/api";
import { toInvitationError, toOrganizationError } from "@/lib/errors";
import { preferredLocale, resolveLocalizedPath } from "@/lib/locale";
import { fakeSupabase } from "./render";

describe("locale", () => {
  test("prefers the saved choice, then the device language", () => {
    expect(preferredLocale("en", ["ar-IQ"])).toBe("en");
    expect(preferredLocale(null, ["fr-FR", "en-US"])).toBe("en");
    expect(preferredLocale(null, ["ar-IQ", "en"])).toBe("ar");
    expect(preferredLocale("xx", ["fr"])).toBe("en");
  });

  test("adds a locale to paths without one", () => {
    expect(resolveLocalizedPath("/", "ar")).toBe("/ar");
    // English, the default language, has no prefix.
    expect(resolveLocalizedPath("/billing?x=1", "en")).toBe("/billing?x=1");
    expect(resolveLocalizedPath("/", "en")).toBe("/");
    expect(resolveLocalizedPath("/en/settings", "ar")).toBe("/en/settings");
    expect(resolveLocalizedPath("/ar", "en")).toBe("/ar");
  });
});

describe("redirect targets", () => {
  test("only accepts paths inside the app", () => {
    expect(safeNextPath("/billing")).toBe("/billing");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe("database errors", () => {
  test("map to messages", () => {
    expect(toOrganizationError({ code: "23505" })).toBe("slugTaken");
    expect(toOrganizationError({ code: "23514" })).toBe("slugInvalid");
    expect(toOrganizationError(new Error("offline"))).toBe("unknown");
    expect(toInvitationError({ code: "P0002" })).toBe("expired");
    expect(toInvitationError({ code: "42501" })).toBe("wrongAccount");
  });
});

describe("deep links", () => {
  test("map to in-app paths", () => {
    expect(deepLinkPath("https://app.example.iq/ar/billing")).toBe(
      "/ar/billing"
    );
    expect(deepLinkPath("com.example.app://ar/invite?token=t")).toBe(
      "/ar/invite?token=t"
    );
    expect(deepLinkPath("com.example.app://billing/")).toBe("/billing");
  });
});

describe("callApi", () => {
  const signedIn = fakeSupabase({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "token-1" } },
      }),
    },
  });

  test("sends the access token and the platform", async () => {
    const fetchMock = vi.fn(async () => Response.json({ url: "https://pay" }));
    const result = await callApi<{ url: string }>(
      signedIn,
      "/checkout",
      { planId: "pro" },
      fetchMock as typeof fetch
    );

    expect(result.url).toBe("https://pay");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://localhost:3002/checkout");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
    expect(headers.get("x-client-platform")).toBe("web");
  });

  test("reports the API's error code", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ error: "store-billing-required" }, { status: 403 })
    );

    await expect(
      callApi(signedIn, "/checkout", {}, fetchMock as typeof fetch)
    ).rejects.toMatchObject({ code: "store-billing-required", status: 403 });
  });

  test("requires a session", async () => {
    await expect(
      callApi(fakeSupabase(), "/checkout", {})
    ).rejects.toBeInstanceOf(ApiError);
  });
});
