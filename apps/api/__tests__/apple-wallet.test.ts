import { createHash, generateKeyPairSync } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import forge from "node-forge";
import { describe, expect, test } from "vitest";
import {
  buildPkpass,
  passJson,
  readPem,
  walletBarcode,
} from "../lib/pass/apple-wallet";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { format: "pem", type: "pkcs8" },
  publicKeyEncoding: { format: "pem", type: "spki" },
});

// A self-signed stand-in for the Pass Type ID certificate (and the WWDR).
const certificate = (() => {
  const key = forge.pki.privateKeyFromPem(privateKey);
  const cert = forge.pki.createCertificate();
  cert.publicKey = forge.pki.setRsaPublicKey(key.n, key.e);
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2026-01-01");
  cert.validity.notAfter = new Date("2036-01-01");
  const subject = [{ name: "commonName", value: "Pass Type ID: pass.test" }];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.sign(key, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
})();

const SIGNER = {
  certificate,
  key: privateKey,
  passTypeId: "pass.com.theideaiq.pass",
  teamId: "ABCDE12345",
  webUrl: "https://theideaiq.com",
  wwdr: Buffer.from(certificate).toString("base64"),
};

const CARD = {
  memberNumber: 100_123,
  name: "Sara",
  serial: "6f1c1b3e-1d1a-4d5e-9b67-7a0f0c1d2e3f",
  token: "0123456789abcdef0123456789abcd",
};

describe("Apple Wallet pass", () => {
  test("the QR code carries the card's fixed code", () => {
    expect(walletBarcode(CARD)).toBe(
      "IDEA:100123:W0123456789abcdef0123456789abcd"
    );
    const pass = passJson(CARD, SIGNER);
    expect(pass).toMatchObject({
      barcodes: [
        {
          altText: "№ 100 123",
          format: "PKBarcodeFormatQR",
          message: "IDEA:100123:W0123456789abcdef0123456789abcd",
        },
      ],
      formatVersion: 1,
      passTypeIdentifier: "pass.com.theideaiq.pass",
      serialNumber: CARD.serial,
      sharingProhibited: true,
      teamIdentifier: "ABCDE12345",
    });
    expect(pass.generic.primaryFields[0].value).toBe("Sara");
  });

  test("PEMs may come as base64", () => {
    expect(readPem(SIGNER.wwdr)).toBe(certificate);
    expect(readPem(certificate)).toBe(certificate);
  });

  test("the .pkpass lists every file's hash and signs the manifest", () => {
    const files = unzipSync(buildPkpass(CARD, SIGNER));
    expect(Object.keys(files).sort()).toEqual(
      [
        "icon.png",
        "icon@2x.png",
        "icon@3x.png",
        "logo.png",
        "logo@2x.png",
        "logo@3x.png",
        "manifest.json",
        "pass.json",
        "signature",
      ].sort()
    );

    const manifestBytes = files["manifest.json"];
    const manifest = JSON.parse(strFromU8(manifestBytes)) as Record<
      string,
      string
    >;
    for (const [name, hash] of Object.entries(manifest)) {
      expect(
        createHash("sha1")
          .update(files[name] ?? new Uint8Array())
          .digest("hex")
      ).toBe(hash);
    }
    expect(Object.keys(manifest)).not.toContain("signature");

    // A detached PKCS #7 signature, by the pass certificate, over the
    // manifest's SHA-256.
    const signature = forge.pkcs7.messageFromAsn1(
      forge.asn1.fromDer(Buffer.from(files.signature).toString("binary"))
    ) as forge.pkcs7.PkcsSignedData & {
      rawCapture: { authenticatedAttributes: forge.asn1.Asn1[] };
    };
    expect(signature.certificates).toHaveLength(2);
    const digest = createHash("sha256").update(manifestBytes).digest();
    const attributes = signature.rawCapture.authenticatedAttributes;
    const signedDigest = attributes
      .map((attribute) => attribute.value as forge.asn1.Asn1[])
      .find(
        ([type]) =>
          forge.asn1.derToOid(type?.value as string) ===
          forge.pki.oids.messageDigest
      )?.[1]?.value as forge.asn1.Asn1[] | undefined;
    expect(
      Buffer.from(signedDigest?.[0]?.value as string, "binary").equals(digest)
    ).toBe(true);
  });
});
