import { describe, expect, test, vi } from "vitest";
import { enabledProviders, startSocialSignIn } from "./social";

const clientWith = (auth: Record<string, unknown>) =>
  ({ auth }) as unknown as Parameters<typeof startSocialSignIn>[0];

describe("social sign-in", () => {
  test("only known providers, in the order given", () => {
    expect(enabledProviders(" apple, google ,twitter,,azure")).toEqual([
      "apple",
      "google",
      "azure",
    ]);
    expect(enabledProviders(undefined)).toEqual([]);
  });

  test("the web leaves for the provider", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/x" },
      error: null,
    });
    const result = await startSocialSignIn(
      clientWith({ signInWithOAuth }),
      "google",
      { redirectTo: "https://theideaiq.com/auth/callback" }
    );
    expect(result.ok).toBe(true);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      options: {
        redirectTo: "https://theideaiq.com/auth/callback",
        scopes: undefined,
        skipBrowserRedirect: false,
      },
      provider: "google",
    });
  });

  test("the apps open the system browser and come back by deep link", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://appleid.apple.com/auth" },
      error: null,
    });
    const openExternal = vi.fn().mockResolvedValue(undefined);
    await startSocialSignIn(clientWith({ signInWithOAuth }), "apple", {
      openExternal,
      redirectTo: "com.theideaiq.app://auth/callback",
    });
    expect(signInWithOAuth.mock.calls[0]?.[0].options).toMatchObject({
      scopes: "name email",
      skipBrowserRedirect: true,
    });
    expect(openExternal).toHaveBeenCalledWith("https://appleid.apple.com/auth");
  });

  test("linking from Settings uses linkIdentity", async () => {
    const linkIdentity = vi
      .fn()
      .mockResolvedValue({ data: { url: "u" }, error: null });
    await startSocialSignIn(clientWith({ linkIdentity }), "linkedin_oidc", {
      link: true,
      redirectTo: "https://theideaiq.com/auth/callback",
    });
    expect(linkIdentity).toHaveBeenCalled();
  });
});
