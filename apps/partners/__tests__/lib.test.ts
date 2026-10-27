import type { OrganizationFeature } from "@repo/auth/organizations";
import { describe, expect, test, vi } from "vitest";
import { visibleNavItems } from "@/components/nav-items";
import { ApiError, callApi } from "@/lib/api";
import { developerError } from "@/lib/developer-queries";
import { toInvitationError, toOrganizationError } from "@/lib/errors";
import { safeNextPath } from "@/lib/navigation";
import { isValidSlug, suggestSlug } from "@/lib/slug";
import { fakeSupabase } from "./render";

describe("redirect targets", () => {
  test("only accepts paths inside the app", () => {
    expect(safeNextPath("/billing")).toBe("/billing");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe("organization addresses", () => {
  test("suggests a valid slug", () => {
    expect(suggestSlug("Acme Trading Co.")).toBe("acme-trading-co");
    expect(suggestSlug("  Café  Baghdad ")).toBe("cafe-baghdad");
    expect(suggestSlug("شركة الرافدين", () => "abc123")).toBe("org-abc123");
    expect(suggestSlug("x".repeat(100))).toHaveLength(64);
  });

  test("matches the database rule", () => {
    expect(isValidSlug("acme-2")).toBe(true);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("acme--x")).toBe(false);
    expect(isValidSlug("-acme")).toBe(false);
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

describe("developer errors", () => {
  test("a bad domain name reads as one; other checks don't", () => {
    expect(
      developerError({
        code: "23514",
        message:
          'new row for relation "pass_partner_domains" violates check constraint',
      })
    ).toBe("invalidDomain");
    expect(
      developerError({
        code: "23514",
        message:
          'new row for relation "pass_partners" violates check constraint "pass_partners_requested_answers_check"',
      })
    ).toBe("unknown");
    expect(developerError({ message: "Too many apps" })).toBe("tooManyApps");
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

describe("visibleNavItems", () => {
  const org = (
    role: "admin" | "member" | "owner",
    features: OrganizationFeature[]
  ) => ({ features, id: "o", name: "Org", role, slug: "org" });
  const keys = (items: { key: string }[]) => items.map((item) => item.key);

  test("shows Home and Organization, plus the sections switched on", () => {
    expect(keys(visibleNavItems(org("owner", [])))).toEqual([
      "home",
      "organization",
    ]);
    expect(
      keys(
        visibleNavItems(org("owner", ["developers", "perks", "bulk_buying"]))
      )
    ).toEqual(["home", "perks", "bulk_buying", "developers", "organization"]);
  });

  test("keeps Developers for owners and admins", () => {
    expect(keys(visibleNavItems(org("member", ["developers"])))).toEqual([
      "home",
      "organization",
    ]);
    expect(keys(visibleNavItems(org("admin", ["developers"])))).toContain(
      "developers"
    );
  });

  test("shows only Home without an organization", () => {
    expect(keys(visibleNavItems(null))).toEqual(["home"]);
  });
});
