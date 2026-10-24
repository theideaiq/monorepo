import { afterEach, describe, expect, test, vi } from "vitest";
import { hostOf, readReturnTo } from "./return-to";

const params = (value: Record<string, string | string[] | undefined>) =>
  Promise.resolve(value);

describe("return_to", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("keeps allowed URLs, replaces others with The IDEA Spark, null when absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://spark.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_DESIGN_URL", "https://design.theideaiq.com");

    expect(
      await readReturnTo(
        params({ return_to: "https://design.theideaiq.com/en" })
      )
    ).toBe("https://design.theideaiq.com/en");
    expect(
      await readReturnTo(params({ return_to: ["https://evil.example/", "x"] }))
    ).toBe("https://spark.theideaiq.com");
    expect(
      await readReturnTo(params({ return_to: "https://admin.theideaiq.com" }))
    ).toBe("https://spark.theideaiq.com");
    expect(await readReturnTo(params({}))).toBeNull();
  });

  test("keeps paths inside The IDEA Spark, never protocol-relative ones", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://spark.theideaiq.com");

    expect(await readReturnTo(params({ return_to: "/en/admin" }))).toBe(
      "/en/admin"
    );
    expect(await readReturnTo(params({ return_to: "//evil.example" }))).toBe(
      "https://spark.theideaiq.com"
    );
  });

  test("accepts the older next parameter, adding the locale", async () => {
    expect(await readReturnTo(params({ next: "/cart" }), "ar")).toBe(
      "/ar/cart"
    );
    expect(await readReturnTo(params({ next: "/en/cart" }), "en")).toBe(
      "/en/cart"
    );
    expect(await readReturnTo(params({ next: "/" }), "en")).toBe("/en");
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
