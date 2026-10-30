import type { OrganizationFeature } from "@repo/auth/organizations";
import { describe, expect, test, vi } from "vitest";
import { type MenuGroup, menuFor } from "@/components/nav-items";
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

describe("menuFor", () => {
  const org = (
    role: "admin" | "member" | "owner",
    features: OrganizationFeature[]
  ) => ({ features, id: "o", name: "Org", role, slug: "org" });
  /** Each group as its entries: a page's key, "+feature" or "apply". */
  const shape = (groups: MenuGroup[]) =>
    Object.fromEntries(
      groups.map((group) => [
        group.key,
        group.entries.map((entry) => {
          if (entry.kind === "link") {
            return entry.item.key;
          }
          return entry.kind === "add" ? `+${entry.feature}` : "apply";
        }),
      ])
    );

  test("keeps its shape: sections not switched on are greyed with Add", () => {
    expect(shape(menuFor(org("owner", []), false))).toEqual({
      grow: ["+supply", "+opportunities", "+perks", "+affiliate"],
      organization: ["+team", "+developers", "settings"],
      sell: ["+selling"],
      today: ["today"],
    });
    expect(
      shape(menuFor(org("owner", ["developers", "perks", "team"]), false))
    ).toEqual({
      grow: ["+supply", "+opportunities", "perks", "+affiliate"],
      organization: ["team", "developers", "settings"],
      sell: ["+selling"],
      today: ["today"],
    });
  });

  test("Sell is Apply to sell until the shop is approved", () => {
    expect(shape(menuFor(org("member", ["selling"]), false)).sell).toEqual([
      "apply",
    ]);
    expect(shape(menuFor(org("member", ["selling"]), true)).sell).toEqual([
      "listings",
      "orders",
      "offers",
      "returns",
      "auctions",
      "promotions",
      "payouts",
      "shopSettings",
    ]);
  });

  test("counts only where something needs action", () => {
    const counted = menuFor(org("owner", ["selling"]), true)
      .flatMap((group) => group.entries)
      .flatMap((entry) =>
        entry.kind === "link" && entry.item.count ? [entry.item.count] : []
      );
    expect(counted).toEqual(["orders", "offers", "returns"]);
  });

  test("keeps Developers for owners and admins", () => {
    expect(
      shape(menuFor(org("member", ["developers"]), false)).organization
    ).toEqual(["+team", "settings"]);
    expect(
      shape(menuFor(org("admin", ["developers"]), false)).organization
    ).toContain("developers");
  });

  test("shows only Today without an organization", () => {
    expect(shape(menuFor(null, false))).toEqual({ today: ["today"] });
  });
});
