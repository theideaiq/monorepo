import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  type LinkTicket,
  TICKET_PURPOSE,
  ticketSecret,
} from "@/lib/telegram-login/config";
import { unseal } from "@/lib/telegram-login/oidc";

export const OPTIONS = preflight;

const bodySchema = z.object({ ticket: z.string().min(10).max(2000) });

/**
 * Links the Telegram account a ticket vouches for (from the sign-in
 * callback or the Mini App) to the caller, and pays the 10-Bulb bonus the first time.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const secret = ticketSecret();
  if (!secret) {
    return json({ error: "not_configured" }, 503);
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  const ticket = body.success
    ? unseal<LinkTicket>(secret, TICKET_PURPOSE, body.data.ticket)
    : null;
  if (!ticket) {
    return json({ error: "invalid_ticket" }, 400);
  }

  const { error } = await createAdminClient().rpc("link_telegram", {
    first_name: ticket.firstName ?? undefined,
    last_name: ticket.lastName ?? undefined,
    member: session.userId,
    telegram_id: ticket.id,
    username: ticket.username ?? undefined,
  });
  if (error?.code === "23505") {
    return json({ error: "telegram_taken" }, 409);
  }
  if (error?.code === "42501") {
    return json({ error: "suspended" }, 403);
  }
  if (error) {
    log.error(`Linking Telegram failed: ${parseError(error)}`);
    return json({ error: "link_failed" }, 500);
  }
  return json({ username: ticket.username });
};
