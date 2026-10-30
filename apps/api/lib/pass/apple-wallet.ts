import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import forge from "node-forge";
import { appleWalletImages } from "./apple-wallet-images";

/**
 * "Add to Apple Wallet" for The IDEA Pass: a signed `.pkpass` (a zip of
 * pass.json, the images, a manifest of their SHA-1 hashes and a detached
 * PKCS #7 signature of the manifest, by the Pass Type ID certificate with
 * Apple's WWDR intermediate).
 *
 * Apple Wallet can't work out the 30-second code, so the card's QR code
 * carries a fixed one, `IDEA:<member number>:W<code>`, from
 * `issue_wallet_card()`; adding the card again replaces it (migration
 * `20270317000000_apple_wallet.sql`).
 */

export interface AppleWalletCard {
  memberNumber: number;
  name: string;
  /** The pass's serial number (`wallet_cards.serial`). */
  serial: string;
  /** The fixed code, 30 hex digits. */
  token: string;
}

export interface AppleWalletSigner {
  /** The Pass Type ID certificate (PEM, or base64 of it). */
  certificate: string;
  /** Its private key (PEM, or base64 of it). */
  key: string;
  passTypeId: string;
  teamId: string;
  /** The website, for the link back to Your Pass. */
  webUrl: string;
  /** Apple's WWDR intermediate certificate (PEM, or base64 of it). */
  wwdr: string;
}

const PEM_HEADER = "-----BEGIN";

/** A PEM as given, or decoded from base64 (how env vars often carry it). */
export const readPem = (value: string) =>
  value.includes(PEM_HEADER)
    ? value
    : Buffer.from(value, "base64").toString("utf8");

const formatMemberNumber = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** What the card's QR code carries. */
export const walletBarcode = (card: AppleWalletCard) =>
  `IDEA:${card.memberNumber}:W${card.token}`;

/** pass.json (exported for tests). */
export const passJson = (
  card: AppleWalletCard,
  {
    passTypeId,
    teamId,
    webUrl,
  }: Omit<AppleWalletSigner, "certificate" | "key" | "wwdr">
) => {
  const passUrl = new URL("/pass", webUrl).toString();
  return {
    backFields: [
      {
        key: "about",
        label: "The IDEA Pass",
        value:
          "Show this code at The IDEA and to partners. It doesn't change: if someone may have a copy, add the card again from Your Pass and this one stops working.",
      },
      {
        attributedValue: `<a href="${passUrl}">Your Pass</a>`,
        key: "pass",
        label: "Your Pass",
        value: passUrl,
      },
    ],
    backgroundColor: "rgb(216, 27, 96)",
    barcodes: [
      {
        altText: `№ ${formatMemberNumber(card.memberNumber)}`,
        format: "PKBarcodeFormatQR",
        message: walletBarcode(card),
        messageEncoding: "iso-8859-1",
      },
    ],
    description: "The IDEA Pass",
    foregroundColor: "rgb(255, 255, 255)",
    formatVersion: 1,
    generic: {
      primaryFields: [{ key: "name", label: "Member", value: card.name }],
      secondaryFields: [
        {
          key: "number",
          label: "Pass number",
          value: formatMemberNumber(card.memberNumber),
        },
      ],
    },
    labelColor: "rgb(255, 255, 255)",
    organizationName: "The IDEA",
    passTypeIdentifier: passTypeId,
    serialNumber: card.serial,
    sharingProhibited: true,
    teamIdentifier: teamId,
  };
};

const sha1 = (data: Uint8Array) =>
  createHash("sha1").update(data).digest("hex");

/** The detached PKCS #7 signature of the manifest, DER. */
const signManifest = (
  manifest: Uint8Array,
  {
    certificate,
    key,
    wwdr,
  }: Pick<AppleWalletSigner, "certificate" | "key" | "wwdr">
) => {
  const signer = forge.pki.certificateFromPem(readPem(certificate));
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(
    Buffer.from(manifest).toString("binary")
  );
  p7.addCertificate(signer);
  p7.addCertificate(forge.pki.certificateFromPem(readPem(wwdr)));
  p7.addSigner({
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // forge fills in the time when no value is given.
      { type: forge.pki.oids.signingTime },
    ],
    certificate: signer,
    digestAlgorithm: forge.pki.oids.sha256,
    key: forge.pki.privateKeyFromPem(readPem(key)),
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
};

/** The signed `.pkpass` for the member's card. */
export const buildPkpass = (
  card: AppleWalletCard,
  signer: AppleWalletSigner
): Uint8Array => {
  const files: Record<string, Uint8Array> = {
    "pass.json": strToU8(JSON.stringify(passJson(card, signer))),
  };
  for (const [name, base64] of Object.entries(appleWalletImages)) {
    files[name] = new Uint8Array(Buffer.from(base64, "base64"));
  }
  const manifest = strToU8(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(files).map(([name, data]) => [name, sha1(data)])
      )
    )
  );
  return zipSync({
    ...files,
    "manifest.json": manifest,
    signature: new Uint8Array(signManifest(manifest, signer)),
  });
};
