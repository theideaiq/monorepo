import { afterEach, describe, expect, test, vi } from "vitest";
import {
  allowedReturnToHosts,
  isAllowedReturnTo,
  passOrigin,
  passUrl,
  safeReturnTo,
} from "./pass";

const hosts = ["theideaiq.com", "spark.theideaiq.com", "design.theideaiq.com"];

describe("isAllowedReturnTo", () => {
  test("accepts The IDEA's own hosts", () => {
    expect(
      isAllowedReturnTo("https://spark.theideaiq.com/en/cart?x=1", { hosts })
    ).toBe(true);
    expect(isAllowedReturnTo("https://theideaiq.com/ar", { hosts })).toBe(true);
  });

  test("refuses other hosts, look-alikes and other schemes", () => {
    for (const url of [
      "https://evil.example/",
      "https://spark.theideaiq.com.evil.example/",
      "https://evilspark.theideaiq.com/",
      "https://user:pass@spark.theideaiq.com/",
      "javascript:alert(1)",
      "//spark.theideaiq.com/",
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
      safeReturnTo("https://evil.example", "https://spark.theideaiq.com", {
        hosts,
      })
    ).toBe("https://spark.theideaiq.com");
    expect(
      safeReturnTo("https://design.theideaiq.com/en", null, { hosts })
    ).toBe("https://design.theideaiq.com/en");
  });
});

describe("allowedReturnToHosts", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("lists the website, The IDEA Spark, the design site and the API", () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://spark.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_DESIGN_URL", "https://design.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.theideaiq.com");

    expect([...allowedReturnToHosts()].sort()).toEqual([
      "api.theideaiq.com",
      "design.theideaiq.com",
      "spark.theideaiq.com",
      "theideaiq.com",
    ]);
    expect(passOrigin()).toBe("https://spark.theideaiq.com");
  });
});

describe("passUrl", () => {
  test("builds locale-prefixed links with an encoded return_to", () => {
    expect(
      passUrl(
        "/sign-in",
        "https://spark.theideaiq.com/en/cart?next=1",
        "en",
        "https://spark.theideaiq.com/"
      )
    ).toBe(
      "https://spark.theideaiq.com/en/sign-in?return_to=https%3A%2F%2Fspark.theideaiq.com%2Fen%2Fcart%3Fnext%3D1"
    );
  });

  test("works without a locale or return_to", () => {
    expect(passUrl("/mfa", null, null, "https://spark.theideaiq.com")).toBe(
      "https://spark.theideaiq.com/mfa"
    );
    expect(passUrl("/", null, "ar", "https://spark.theideaiq.com")).toBe(
      "https://spark.theideaiq.com/ar/pass"
    );
  });
});
