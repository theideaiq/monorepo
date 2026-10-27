import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  clientCredentials,
  oauthError,
  parseSigningKey,
  randomToken,
  sameDigest,
  sha256Hex,
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
