import { describe, expect, test } from "vitest";
import { isAllowedReturnTo, passUrl, safeReturnTo } from "./pass";

const hosts = ["theideaiq.com", "app.theideaiq.com", "admin.theideaiq.com"];

describe("isAllowedReturnTo", () => {
  test("accepts The IDEA's own hosts", () => {
    expect(
      isAllowedReturnTo("https://app.theideaiq.com/en/cart?x=1", { hosts })
    ).toBe(true);
    expect(isAllowedReturnTo("https://theideaiq.com/ar", { hosts })).toBe(true);
  });

  test("refuses other hosts, look-alikes and other schemes", () => {
    for (const url of [
      "https://evil.example/",
      "https://app.theideaiq.com.evil.example/",
      "https://evilapp.theideaiq.com/",
      "https://user:pass@app.theideaiq.com/",
      "javascript:alert(1)",
      "//app.theideaiq.com/",
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
      safeReturnTo("https://evil.example", "https://app.theideaiq.com", {
        hosts,
      })
    ).toBe("https://app.theideaiq.com");
    expect(
      safeReturnTo("https://admin.theideaiq.com/en", null, { hosts })
    ).toBe("https://admin.theideaiq.com/en");
  });
});

describe("passUrl", () => {
  test("builds locale-prefixed links with an encoded return_to", () => {
    expect(
      passUrl(
        "/sign-in",
        "https://app.theideaiq.com/en/cart?next=1",
        "en",
        "https://pass.theideaiq.com/"
      )
    ).toBe(
      "https://pass.theideaiq.com/en/sign-in?return_to=https%3A%2F%2Fapp.theideaiq.com%2Fen%2Fcart%3Fnext%3D1"
    );
  });

  test("works without a locale or return_to", () => {
    expect(passUrl("/mfa", null, null, "https://pass.theideaiq.com")).toBe(
      "https://pass.theideaiq.com/mfa"
    );
    expect(passUrl("/", null, "ar", "https://pass.theideaiq.com")).toBe(
      "https://pass.theideaiq.com/ar"
    );
  });
});
