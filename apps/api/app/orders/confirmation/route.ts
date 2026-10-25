import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import { sendOrderEmails } from "@/lib/order-emails";

const requestBody = z.object({ orderId: z.uuid() });

export const OPTIONS = preflight;

/**
 * Emails the confirmation of one of the caller's cash orders (or one paid
 * in full with Bulbs), once (online orders are confirmed by the payment
 * webhook). The order is claimed by setting `confirmation_emailed_at`, so
 * repeated calls send nothing more.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (payload: object, status = 200) =>
    NextResponse.json(payload, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  const parsed = requestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }

  const admin = createAdminClient();
  const { orderId } = parsed.data;
  const { data, error } = await admin
    .from("orders")
    .update({ confirmation_emailed_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("user_id", session.userId)
    // Cash orders, and orders paid in full with Bulbs (nothing paid online).
    .or("payment_method.eq.cash_on_delivery,total.eq.0")
    .is("confirmation_emailed_at", null)
    .select("id");
  if (error) {
    log.error(`Cash order confirmation failed: ${error.message}`);
    return json({ error: "confirmation_failed" }, 502);
  }
  if (!data?.length) {
    return json({ ok: true, sent: false });
  }

  after(() =>
    sendOrderEmails(orderId, {
      admin,
      logger: log,
      notifyTo: env.STORE_NOTIFICATIONS_EMAIL,
      send: sendEmail,
    }).catch((sendError: unknown) =>
      log.error(`Order confirmation email failed: ${parseError(sendError)}`)
    )
  );
  return json({ ok: true, sent: true });
};
