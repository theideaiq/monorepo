import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { getPushSender } from "@/lib/push";
import { deliverPushNotifications } from "@/lib/push/deliver";
import { hasBearerSecret } from "@/lib/push/secret";

// Supabase Database Webhook payload (INSERT on public.notifications).
const payloadSchema = z.object({
  record: z.object({ id: z.uuid() }),
  table: z.literal("notifications"),
  type: z.literal("INSERT"),
});

/**
 * Pushes a new notification to the recipient's phones. Called by a
 * Supabase Database Webhook on inserts into `notifications`, with
 * `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`. Only the row id is taken
 * from the payload; the row itself is read (and claimed) from the database.
 */
export const POST = async (request: Request): Promise<Response> => {
  if (!hasBearerSecret(request, env.PUSH_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = payloadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!payload.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const sender = getPushSender();
  if (!sender) {
    return NextResponse.json({ ok: true, skipped: "push_not_configured" });
  }

  try {
    const summary = await deliverPushNotifications(
      createAdminClient(),
      sender,
      [payload.data.record.id]
    );
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    log.error(`Push webhook failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};
