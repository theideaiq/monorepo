import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import { walletClaims, walletSaveUrl } from "../lib/pass/wallet";
import type { ServiceAccount } from "../lib/push/fcm";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

const OPTIONS = {
  account: {
    client_email: "wallet@the-idea.iam.gserviceaccount.com",
    private_key: privateKey,
    project_id: "the-idea",
    token_uri: "https://oauth2.googleapis.com/token",
  } satisfies ServiceAccount,
  issuerId: "3388000000012345678",
  webUrl: "https://theideaiq.com",
};

const MEMBER = { memberNumber: 100_123, name: "Sara", secret: "abcdef0123" };

describe("Google Wallet save link", () => {
  test("the pass rotates the same TOTP code as the card", () => {
    const claims = walletClaims(MEMBER, OPTIONS, 1_700_000_000);
    const [object] = claims.payload.genericObjects;
    expect(claims).toMatchObject({
      aud: "google",
      iss: OPTIONS.account.client_email,
      origins: ["https://theideaiq.com"],
      typ: "savetowallet",
    });
    expect(object.id).toBe("3388000000012345678.member_100123");
    expect(object.classId).toBe("3388000000012345678.the_idea_pass");
    expect(object.rotatingBarcode).toMatchObject({
      alternateText: "№ 100 123",
      totpDetails: {
        algorithm: "TOTP_SHA1",
        parameters: [{ key: "abcdef0123", valueLength: 6 }],
        periodMillis: "30000",
      },
      valuePattern: "IDEA:100123:{totp_value_0}",
    });
  });

  test("the link is an RS256 JWT signed by the service account", () => {
    const url = walletSaveUrl(MEMBER, OPTIONS, 1_700_000_000);
    expect(url.startsWith("https://pay.google.com/gp/v/save/")).toBe(true);
    const [header, claims, signature] = url.split("/").at(-1)?.split(".") ?? [];
    expect(
      JSON.parse(Buffer.from(header ?? "", "base64url").toString())
    ).toEqual({ alg: "RS256", typ: "JWT" });
    const valid = createVerify("RSA-SHA256")
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(signature ?? "", "base64url"));
    expect(valid).toBe(true);
  });
});
