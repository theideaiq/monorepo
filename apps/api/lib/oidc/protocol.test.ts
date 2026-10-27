import { createHash } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  clientAssertion,
  clientCredentials,
  oauthError,
  parseSigningKey,
  randomToken,
  sameDigest,
  secretMatches,
  sha256Hex,
  verifyClientAssertion,
  verifyPkce,
} from "./protocol";

const HEX_64 = /^[0-9a-f]{64}$/;

describe("PKCE", () => {
  const verifier = "a".repeat(43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  it("accepts the verifier that hashes to the challenge", () => {
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it("refuses anything else", () => {
    expect(verifyPkce("b".repeat(43), challenge)).toBe(false);
    expect(verifyPkce(null, challenge)).toBe(false);
    expect(verifyPkce("short", challenge)).toBe(false);
  });
});

describe("client credentials", () => {
  const empty = new URLSearchParams();

  it("come from HTTP Basic", () => {
    const basic = Buffer.from("pass_abc:s3cret:with:colons").toString("base64");
    expect(clientCredentials(`Basic ${basic}`, empty)).toEqual({
      clientId: "pass_abc",
      secret: "s3cret:with:colons",
    });
  });

  it("or from the form", () => {
    const form = new URLSearchParams({
      client_id: "pass_abc",
      client_secret: "x",
    });
    expect(clientCredentials(null, form)).toEqual({
      clientId: "pass_abc",
      secret: "x",
    });
    expect(clientCredentials(null, empty)).toBeNull();
    expect(
      clientCredentials(
        `Basic ${Buffer.from("nocolon").toString("base64")}`,
        empty
      )
    ).toBeNull();
  });
});

describe("digests", () => {
  it("compare in constant time, by value", () => {
    const token = randomToken();
    expect(token).toMatch(HEX_64);
    expect(sameDigest(sha256Hex(token), sha256Hex(token))).toBe(true);
    expect(sameDigest(sha256Hex(token), sha256Hex(`${token}x`))).toBe(false);
    expect(sameDigest(sha256Hex(token), "abcd")).toBe(false);
  });
});

describe("errors", () => {
  it("follow RFC 6749", () => {
    expect(oauthError("invalid_grant")).toEqual({ error: "invalid_grant" });
    expect(oauthError("invalid_request", "why")).toEqual({
      error: "invalid_request",
      error_description: "why",
    });
  });
});

describe("the signing key", () => {
  const jwk = {
    crv: "P-256",
    d: "x".repeat(43),
    kid: "k1",
    kty: "EC",
    x: "a",
    y: "b",
  };

  it("is read as JSON or base64", () => {
    expect(parseSigningKey(JSON.stringify(jwk))?.kid).toBe("k1");
    expect(
      parseSigningKey(Buffer.from(JSON.stringify(jwk)).toString("base64"))?.kid
    ).toBe("k1");
  });

  it("must be a private P-256 key with a kid", () => {
    expect(parseSigningKey(undefined)).toBeNull();
    expect(parseSigningKey("not json")).toBeNull();
    expect(
      parseSigningKey(JSON.stringify({ ...jwk, d: undefined }))
    ).toBeNull();
    expect(
      parseSigningKey(JSON.stringify({ ...jwk, kid: undefined }))
    ).toBeNull();
  });
});

describe("secrets after a rotation", () => {
  const partner = {
    previous_secret_hash: sha256Hex("old"),
    previous_secret_until: new Date(Date.now() + 60_000).toISOString(),
    secret_hash: sha256Hex("new"),
  };

  it("accepts the new secret and, for a while, the previous one", () => {
    expect(secretMatches(partner, "new")).toBe(true);
    expect(secretMatches(partner, "old")).toBe(true);
    expect(secretMatches(partner, "other")).toBe(false);
  });

  it("refuses the previous secret once its time is up", () => {
    expect(secretMatches(partner, "old", Date.now() + 120_000)).toBe(false);
    expect(
      secretMatches({ ...partner, previous_secret_until: null }, "old")
    ).toBe(false);
  });
});

describe("private_key_jwt", () => {
  const ISSUER = "https://api.theideaiq.com/oidc";
  const CLIENT = `pass_${"a".repeat(24)}`;
  const TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

  const setup = async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwks = { keys: [{ ...(await exportJWK(publicKey)), kid: "k1" }] };
    const sign = (claims: Record<string, unknown>, expires = "2m") =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: "ES256", kid: "k1" })
        .setIssuer(CLIENT)
        .setSubject(CLIENT)
        .setAudience(`${ISSUER}/token`)
        .setIssuedAt()
        .setExpirationTime(expires)
        .sign(privateKey);
    return { jwks, sign };
  };

  it("reads the client from the assertion", async () => {
    const { sign } = await setup();
    const assertion = await sign({ jti: "jti-123456" });
    const form = new URLSearchParams({
      client_assertion: assertion,
      client_assertion_type: TYPE,
    });
    expect(clientAssertion(form)).toEqual({ assertion, clientId: CLIENT });
    form.set("client_id", `pass_${"b".repeat(24)}`);
    expect(clientAssertion(form)).toBeNull();
    expect(clientAssertion(new URLSearchParams())).toBeNull();
  });

  it("accepts a short-lived assertion signed with the partner's key", async () => {
    const { jwks, sign } = await setup();
    const verified = await verifyClientAssertion(
      await sign({ jti: "jti-123456" }),
      CLIENT,
      jwks,
      ISSUER
    );
    expect(verified?.jti).toBe("jti-123456");
  });

  it("refuses other keys, no jti or a long life", async () => {
    const { jwks, sign } = await setup();
    const other = await setup();
    expect(
      await verifyClientAssertion(
        await other.sign({ jti: "jti-123456" }),
        CLIENT,
        jwks,
        ISSUER
      )
    ).toBeNull();
    expect(
      await verifyClientAssertion(await sign({}), CLIENT, jwks, ISSUER)
    ).toBeNull();
    expect(
      await verifyClientAssertion(
        await sign({ jti: "jti-123456" }, "1h"),
        CLIENT,
        jwks,
        ISSUER
      )
    ).toBeNull();
  });
});
