import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, test } from "vitest";
import {
  authorizeUrl,
  codeChallenge,
  seal,
  TELEGRAM_ISSUER,
  unseal,
  verifyIdToken,
} from "./oidc";

const secret = "a-test-client-secret-of-some-length";

describe("Telegram sign-in", () => {
  test("asks for a PKCE S256 code with the profile and bot scopes", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "123",
        redirectUri: "https://api.example/auth/telegram/callback",
        state: "s1",
        verifier: "v1",
      })
    );
    expect(url.origin + url.pathname).toBe(`${TELEGRAM_ISSUER}/auth`);
    expect(url.searchParams.get("code_challenge")).toBe(codeChallenge("v1"));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toBe(
      "openid profile telegram:bot_access"
    );
    expect(url.searchParams.get("state")).toBe("s1");
  });

  test("seals values with a purpose and an expiry", () => {
    const sealed = seal(secret, "a", { id: 7 }, 60);
    expect(unseal<{ id: number }>(secret, "a", sealed)?.id).toBe(7);
    expect(unseal(secret, "b", sealed)).toBeNull();
    expect(unseal("another-secret-entirely-here", "a", sealed)).toBeNull();
    expect(unseal(secret, "a", `${sealed}x`)).toBeNull();
    expect(unseal(secret, "a", seal(secret, "a", { id: 7 }, -1))).toBeNull();
    expect(unseal(secret, "a", null)).toBeNull();
  });

  test("trusts only ID tokens Telegram signed for this bot", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwk = { ...(await exportJWK(publicKey)), alg: "ES256", kid: "k1" };
    const keys = createLocalJWKSet({ keys: [jwk] });
    const token = (
      claims: object,
      audience = "123",
      issuer = TELEGRAM_ISSUER
    ) =>
      new SignJWT({ ...claims })
        .setProtectedHeader({ alg: "ES256", kid: "k1" })
        .setIssuer(issuer)
        .setAudience(audience)
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey);

    await expect(
      verifyIdToken(
        await token({
          given_name: "Zainab",
          id: 987_654_321,
          name: "Zainab Ali",
          preferred_username: "zainab",
        }),
        "123",
        keys
      )
    ).resolves.toEqual({
      firstName: "Zainab",
      id: 987_654_321,
      lastName: null,
      name: "Zainab Ali",
      username: "zainab",
    });
    await expect(
      verifyIdToken(await token({ id: 1 }, "999"), "123", keys)
    ).rejects.toThrow();
    await expect(
      verifyIdToken(await token({ id: 1 }, "123", "https://evil"), "123", keys)
    ).rejects.toThrow();
    await expect(verifyIdToken(await token({}), "123", keys)).rejects.toThrow(
      "no Telegram user id"
    );
  });
});
