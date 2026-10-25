import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import { walletSaveUrl } from "@/lib/pass/wallet";
import { parseServiceAccount } from "@/lib/push/fcm";

export const OPTIONS = preflight;

const bodySchema = z.object({ check: z.boolean().optional() });

/**
 * "Add to Google Wallet" for the caller's The IDEA Pass card. With
 * `{ check: true }` it only says whether Google Wallet is set up; otherwise
 * it returns the signed save link. Runs as the caller: `my_pass_secret()`
 * returns only their own card.
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

  const account = parseServiceAccount(env.GOOGLE_WALLET_SERVICE_ACCOUNT);
  const issuerId = env.GOOGLE_WALLET_ISSUER_ID;
  if (body.data.check) {
    return json({ available: Boolean(account && issuerId) });
  }
  if (!(account && issuerId)) {
    return json({ error: "not_configured" }, 503);
  }

  const [{ data: card, error }, { data: profile }] = await Promise.all([
    session.supabase.rpc("my_pass_secret"),
    session.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle(),
  ]);
  const row = card?.[0];
  if (error || !row) {
    log.error(`Google Wallet card failed: ${parseError(error)}`);
    return json({ error: "card_failed" }, 500);
  }

  const url = walletSaveUrl(
    {
      memberNumber: row.member_number,
      name: profile?.full_name?.trim() || "The IDEA Pass",
      secret: row.secret,
    },
    { account, issuerId, webUrl: env.NEXT_PUBLIC_WEB_URL }
  );
  return json({ url });
};
