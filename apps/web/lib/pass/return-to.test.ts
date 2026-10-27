import { afterEach, describe, expect, test, vi } from "vitest";
import { hostOf, readReturnTo } from "./return-to";

const params = (value: Record<string, string | string[] | undefined>) =>
  Promise.resolve(value);

describe("return_to", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("keeps allowed URLs, replaces others with the website, null when absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_STAFF_URL", "https://staff.theideaiq.com");

    expect(
      await readReturnTo(
        params({ return_to: "https://staff.theideaiq.com/en" })
      )
    ).toBe("https://staff.theideaiq.com/en");
    expect(
      await readReturnTo(params({ return_to: ["https://evil.example/", "x"] }))
    ).toBe("https://theideaiq.com");
    expect(
      await readReturnTo(params({ return_to: "https://admin.theideaiq.com" }))
    ).toBe("https://theideaiq.com");
    expect(await readReturnTo(params({}))).toBeNull();
  });

  test("keeps paths on this site, never protocol-relative ones", async () => {
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://theideaiq.com");

    expect(await readReturnTo(params({ return_to: "/en/pass/orders" }))).toBe(
      "/en/pass/orders"
    );
    expect(await readReturnTo(params({ return_to: "//evil.example" }))).toBe(
      "https://theideaiq.com"
    );
  });

  test("accepts the older next parameter, adding the locale", async () => {
    expect(await readReturnTo(params({ next: "/cart" }), "ar")).toBe(
      "/ar/cart"
    );
    expect(await readReturnTo(params({ next: "/cart" }), "en")).toBe("/cart");
    expect(await readReturnTo(params({ next: "/" }), "en")).toBe("/");
    expect(
      await readReturnTo(params({ next: "https://evil.example" }), "en")
    ).toBeNull();
  });

  test("shows the host people continue to", () => {
    expect(hostOf("https://theideaiq.com/en/store")).toBe("theideaiq.com");
    expect(hostOf("http://localhost:3001/en")).toBe("localhost:3001");
    expect(hostOf("/en/cart")).toBeNull();
    expect(hostOf(null)).toBeNull();
  });
});
