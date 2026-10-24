import { afterEach, describe, expect, test, vi } from "vitest";
import { hostOf, readReturnTo } from "./return-to";

const params = (value: Record<string, string | string[] | undefined>) =>
  Promise.resolve(value);

describe("return_to", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("keeps allowed URLs, replaces others with the app, null when absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.theideaiq.com");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.theideaiq.com");

    expect(
      await readReturnTo(
        params({ return_to: "https://admin.theideaiq.com/en" })
      )
    ).toBe("https://admin.theideaiq.com/en");
    expect(
      await readReturnTo(params({ return_to: ["https://evil.example/", "x"] }))
    ).toBe("https://app.theideaiq.com");
    expect(await readReturnTo(params({}))).toBeNull();
  });

  test("shows the host people continue to", () => {
    expect(hostOf("https://app.theideaiq.com/en/cart")).toBe(
      "app.theideaiq.com"
    );
    expect(hostOf("http://localhost:3000/en")).toBe("localhost:3000");
    expect(hostOf(null)).toBeNull();
  });
});
