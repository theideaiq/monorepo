import { afterEach, describe, expect, test, vi } from "vitest";

describe("authCookieOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("host-only when no cookie domain is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN", "");
    const { authCookieOptions } = await import("./cookies");
    const options = authCookieOptions();
    expect(options.domain).toBeUndefined();
    expect(options).toMatchObject({ path: "/", sameSite: "lax" });
  });

  test("the whole domain when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN", ".theideaiq.com");
    const { authCookieOptions } = await import("./cookies");
    expect(authCookieOptions().domain).toBe(".theideaiq.com");
  });
});
