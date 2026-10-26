import { createSign } from "node:crypto";
import type { ServiceAccount } from "@/lib/push/fcm";

/**
 * "Add to Google Wallet" for The IDEA Pass: a signed "save to wallet" link
 * carrying a generic pass whose QR code rotates by itself in Google Wallet,
 * with the same TOTP code as the card on the website (the member's secret,
 * 30-second steps, 6 digits), so the counter checks both the same way.
 *
 * The class is created with the first save; the object id is the member
 * number, so saving again updates the same pass.
 */

export interface WalletMember {
  memberNumber: number;
  name: string;
  /** The card secret, hex (as `my_pass_secret()` returns it). */
  secret: string;
}

interface WalletOptions {
  account: ServiceAccount;
  issuerId: string;
  /** The website, for the logo and the link back to Your Pass. */
  webUrl: string;
}

const CLASS_SUFFIX = "the_idea_pass";

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64url");

const formatMemberNumber = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** The JWT payload of the save link (exported for tests). */
export const walletClaims = (
  member: WalletMember,
  { account, issuerId, webUrl }: WalletOptions,
  nowS: number
) => {
  const classId = `${issuerId}.${CLASS_SUFFIX}`;
  const passUrl = new URL("/pass", webUrl).toString();
  return {
    aud: "google",
    iat: nowS,
    iss: account.client_email,
    origins: [new URL(webUrl).origin],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [
        {
          cardTitle: {
            defaultValue: { language: "en", value: "The IDEA Pass" },
          },
          classId,
          header: { defaultValue: { language: "en", value: member.name } },
          hexBackgroundColor: "#d81b60",
          id: `${issuerId}.member_${member.memberNumber}`,
          linksModuleData: {
            uris: [{ description: "Your Pass", id: "my_pass", uri: passUrl }],
          },
          logo: {
            sourceUri: { uri: new URL("/icon.png", webUrl).toString() },
          },
          rotatingBarcode: {
            alternateText: `№ ${formatMemberNumber(member.memberNumber)}`,
            totpDetails: {
              algorithm: "TOTP_SHA1",
              parameters: [{ key: member.secret, valueLength: 6 }],
              periodMillis: "30000",
            },
            type: "QR_CODE",
            valuePattern: `IDEA:${member.memberNumber}:{totp_value_0}`,
          },
          state: "ACTIVE",
          subheader: { defaultValue: { language: "en", value: "Member" } },
        },
      ],
    },
    typ: "savetowallet",
  };
};

/** The https://pay.google.com save link for the member's card. */
export const walletSaveUrl = (
  member: WalletMember,
  options: WalletOptions,
  nowS = Math.floor(Date.now() / 1000)
) => {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify(walletClaims(member, options, nowS)));
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(options.account.private_key);
  return `https://pay.google.com/gp/v/save/${header}.${claims}.${base64url(signature)}`;
};
