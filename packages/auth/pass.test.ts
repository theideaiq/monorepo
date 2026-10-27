import { afterEach, describe, expect, test, vi } from "vitest";
import {
  allowedReturnToHosts,
  isAllowedReturnTo,
  passOrigin,
  passUrl,
  safeReturnTo,
} from "./pass";

const hosts = [
  "theideaiq.com",
  "business.theideaiq.com",
  "design.theideaiq.com",
];

describe("isAllowedReturnTo", () => {
  test("accepts The IDEA's own hosts", () => {
    expect(
      isAllowedReturnTo("https://business.theideaiq.com/en/cart?x=1", { hosts })
    ).toBe(true);
    expect(isAllowedReturnTo("https://theideaiq.com/ar", { hosts })).toBe(true);
  });

  test("refuses other hosts, look-alikes and other schemes", () => {
    for (const url of [
      "https://evil.example/",
      "https://business.theideaiq.com.evil.example/",
      "https://evilbusiness.theideaiq.com/",
      "https://user:pass@business.theideaiq.com/",
      "javascript:alert(1)",
      "//business.theideaiq.com/",
      "/en/cart",
      "data:text/html,hi",
      "",
      null,
      undefined,
    ]) {
      expect(isAllowedReturnTo(url, { allowLocalhost: false, hosts })).toBe(
        false
      );
    }
  });

  test("allows localhost only when asked (development)", () => {
    expect(
      isAllowedReturnTo("http://localhost:3005/en", {
        allowLocalhost: false,
        hosts,
      })
    ).toBe(false);
    expect(
      isAllowedReturnTo("http://localhost:3005/en", {
        allowLocalhost: true,
        hosts,
      })
    ).toBe(true);
  });

  test("safeReturnTo falls back", () => {
    expect(
      safeReturnTo("https://evil.example", "https://business.theideaiq.com", {
        hosts,
      })
    ).toBe("https://business.theideaiq.com");
    expect(
      safeReturnTo("https://design.theideaiq.com/en", null, { hosts })
    ).toBe("https://design.theideaiq.com/en");
  });
});

describe("allowedReturnToHosts", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("lists the website (bare and www), The IDEA Business, the design site and the API", () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://business.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_DESIGN_URL", "https://design.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.theideaiq.com");

    expect([...allowedReturnToHosts()].sort()).toEqual([
      "api.theideaiq.com",
      "business.theideaiq.com",
      "design.theideaiq.com",
      "theideaiq.com",
      "www.theideaiq.com",
    ]);
    expect(passOrigin()).toBe("https://theideaiq.com");
  });
});

describe("passUrl", () => {
  test("builds localized links with an encoded return_to", () => {
    expect(
      passUrl(
        "/sign-in",
        "https://business.theideaiq.com/ar/business?next=1",
        "ar",
        "https://theideaiq.com/"
      )
    ).toBe(
      "https://theideaiq.com/ar/sign-in?return_to=https%3A%2F%2Fbusiness.theideaiq.com%2Far%2Fbusiness%3Fnext%3D1"
    );
    // English, the default language, has no prefix.
    expect(passUrl("/", null, "en", "https://theideaiq.com")).toBe(
      "https://theideaiq.com/pass"
    );
  });

  test("works without a locale or return_to", () => {
    expect(passUrl("/mfa", null, null, "https://business.theideaiq.com")).toBe(
      "https://business.theideaiq.com/mfa"
    );
    expect(passUrl("/", null, "ar", "https://business.theideaiq.com")).toBe(
      "https://business.theideaiq.com/ar/pass"
    );
  });
});
