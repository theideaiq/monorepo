import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { getPushSender } from "@/lib/push";
import { deliverPushNotifications } from "@/lib/push/deliver";
import { getWhatsAppSender, whatsappFallbackLanguage } from "@/lib/whatsapp";
import { deliverWhatsAppNotifications } from "@/lib/whatsapp/deliver";

/**
 * Catch-up for push notifications and WhatsApp messages the database
 * webhook missed (API down, webhook not set up yet): sends unsent
 * notifications of the last day on each configured channel.
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const pushSender = getPushSender();
  const whatsappSender = getWhatsAppSender();
  if (!(pushSender || whatsappSender)) {
    return NextResponse.json({ ok: true, skipped: "push_not_configured" });
  }

  const admin = createAdminClient();
  const [push, whatsapp] = await Promise.allSettled([
    pushSender ? deliverPushNotifications(admin, pushSender) : null,
    whatsappSender
      ? deliverWhatsAppNotifications(admin, whatsappSender, {
          fallbackLanguage: whatsappFallbackLanguage(),
        })
      : null,
  ]);

  if (push.status === "rejected") {
    log.error(`Push catch-up failed: ${parseError(push.reason)}`);
  }
  if (whatsapp.status === "rejected") {
    log.error(`WhatsApp catch-up failed: ${parseError(whatsapp.reason)}`);
  }
  if (push.status === "rejected" || whatsapp.status === "rejected") {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...(push.value ?? { skipped: "push_not_configured" }),
    ...(whatsapp.value ? { whatsapp: whatsapp.value } : {}),
  });
};
