import { createHash } from "node:crypto";
import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { EncryptJWT, jwtDecrypt } from "jose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  type AppleWalletCard,
  type AppleWalletSigner,
  buildPkpass,
} from "@/lib/pass/apple-wallet";

export const OPTIONS = preflight;

const bodySchema = z.object({ check: z.boolean().optional() });

const ticketSchema = z.object({
  memberNumber: z.number().int().positive(),
  name: z.string().min(1).max(200),
  serial: z.uuid(),
  token: z.string().regex(/^[0-9a-f]{30}$/),
});

/** How long the link to the card works. */
const TICKET_TTL = "5m";

const signerFromEnv = (): AppleWalletSigner | null => {
  const {
    APPLE_WALLET_CERTIFICATE: certificate,
    APPLE_WALLET_KEY: key,
    APPLE_WALLET_PASS_TYPE_ID: passTypeId,
    APPLE_WALLET_TEAM_ID: teamId,
    APPLE_WALLET_WWDR: wwdr,
  } = env;
  if (!(certificate && key && passTypeId && teamId && wwdr)) {
    return null;
  }
  return {
    certificate,
    key,
    passTypeId,
    teamId,
    webUrl: env.NEXT_PUBLIC_WEB_URL,
    wwdr,
  };
};

// The link's key, derived from the pass key so there's no other secret.
const ticketKey = (signer: AppleWalletSigner) =>
  createHash("sha256").update(`apple-wallet-ticket:${signer.key}`).digest();

/**
 * "Add to Apple Wallet" for the caller's The IDEA Pass card. With
 * `{ check: true }` it only says whether Apple Wallet is set up; otherwise
 * it issues a new card (`issue_wallet_card()`, as the caller: the card
 * already in Apple Wallet stops working) and returns a link to it that
 * works for five minutes, for Safari to open in Apple Wallet.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return json({ error: "invalid_request" }, 400);
  }

  const signer = signerFromEnv();
  if (body.data.check) {
    return json({ available: Boolean(signer) });
  }
  if (!signer) {
    return json({ error: "not_configured" }, 503);
  }

  const [{ data: issued, error }, { data: profile }] = await Promise.all([
    session.supabase.rpc("issue_wallet_card"),
    session.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle(),
  ]);
  const row = issued?.[0];
  if (error || !row) {
    log.error(`Apple Wallet card failed: ${parseError(error)}`);
    return json({ error: "card_failed" }, 500);
  }

  const card: AppleWalletCard = {
    memberNumber: row.member_number,
    name: profile?.full_name?.trim() || "The IDEA Pass",
    serial: row.serial,
    token: row.token,
  };
  const ticket = await new EncryptJWT({ ...card })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(TICKET_TTL)
    .encrypt(ticketKey(signer));
  const url = new URL("/pass/apple-wallet", request.url);
  url.searchParams.set("ticket", ticket);
  return json({ url: url.toString() });
};

/** The `.pkpass` behind a link from POST. */
export const GET = async (request: Request) => {
  const signer = signerFromEnv();
  if (!signer) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const ticket = new URL(request.url).searchParams.get("ticket") ?? "";
  const card = await jwtDecrypt(ticket, ticketKey(signer))
    .then(({ payload }) => ticketSchema.parse(payload))
    .catch(() => null);
  if (!card) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  return new Response(Buffer.from(buildPkpass(card, signer)), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="the-idea-pass.pkpass"',
      "Content-Type": "application/vnd.apple.pkpass",
    },
  });
};
