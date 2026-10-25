import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { getPushSender } from "@/lib/push";
import { deliverPushNotifications } from "@/lib/push/deliver";
import { hasBearerSecret } from "@/lib/push/secret";
import { getDroid } from "@/lib/telegram";
import { deliverTelegramNotifications } from "@/lib/telegram-notify";
import { getWhatsAppSender, whatsappFallbackLanguage } from "@/lib/whatsapp";
import { deliverWhatsAppNotifications } from "@/lib/whatsapp/deliver";

// Supabase Database Webhook payload (INSERT on public.notifications).
const payloadSchema = z.object({
  record: z.object({ id: z.uuid() }),
  table: z.literal("notifications"),
  type: z.literal("INSERT"),
});

/**
 * Pushes a new notification to the recipient's phones, sends it on Telegram
 * to members who linked it and, for the events with a WhatsApp template,
 * on WhatsApp to customers who opted in.
 * Called by a Supabase Database Webhook on inserts into `notifications`,
 * with `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`. Only the row id is
 * taken from the payload; the row itself is read (and claimed) from the
 * database. Each channel runs only when it is configured.
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

  const pushSender = getPushSender();
  const whatsappSender = getWhatsAppSender();
  const droid = getDroid();
  if (!(pushSender || whatsappSender || droid)) {
    return NextResponse.json({ ok: true, skipped: "push_not_configured" });
  }

  const ids = [payload.data.record.id];
  const admin = createAdminClient();
  const [push, whatsapp, telegram] = await Promise.allSettled([
    pushSender ? deliverPushNotifications(admin, pushSender, ids) : null,
    whatsappSender
      ? deliverWhatsAppNotifications(admin, whatsappSender, {
          fallbackLanguage: whatsappFallbackLanguage(),
          ids,
        })
      : null,
    droid
      ? droid.then((bot) => deliverTelegramNotifications(admin, bot, ids))
      : null,
  ]);

  if (push.status === "rejected") {
    log.error(`Push webhook failed: ${parseError(push.reason)}`);
  }
  if (whatsapp.status === "rejected") {
    log.error(`WhatsApp webhook failed: ${parseError(whatsapp.reason)}`);
  }
  if (telegram.status === "rejected") {
    log.error(`Telegram notifications failed: ${parseError(telegram.reason)}`);
  }
  if (
    push.status === "rejected" ||
    whatsapp.status === "rejected" ||
    telegram.status === "rejected"
  ) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...(push.value ?? { skipped: "push_not_configured" }),
    ...(whatsapp.value ? { whatsapp: whatsapp.value } : {}),
    ...(telegram.value ? { telegram: telegram.value } : {}),
  });
};
