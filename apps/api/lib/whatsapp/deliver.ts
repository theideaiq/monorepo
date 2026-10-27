import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WhatsAppLanguage,
  WhatsAppResult,
  WhatsAppSender,
} from "./client";
import { templateMessage } from "./templates";

export interface WhatsAppSummary {
  failed: number;
  notifications: number;
  sent: number;
  skipped: number;
}

/**
 * Sends WhatsApp template messages for new notifications (order confirmed
 * and shipped, rental due soon) to customers who opted in.
 *
 * `claim_whatsapp_notifications` marks the rows in the same statement that
 * returns them, so the database webhook and the catch-up cron never send
 * one twice (a failed send is not retried: the notification is still in the
 * app and pushed). `ids` limits the run to those notifications (the
 * webhook); without it the last day's unsent notifications are taken (the
 * cron).
 */
export const deliverWhatsAppNotifications = async (
  admin: SupabaseClient<Database>,
  sender: WhatsAppSender,
  {
    fallbackLanguage,
    ids,
  }: { fallbackLanguage: WhatsAppLanguage; ids?: string[] }
): Promise<WhatsAppSummary> => {
  const { data: notifications, error } = await admin.rpc(
    "claim_whatsapp_notifications",
    ids ? { notification_ids: ids } : {}
  );
  if (error) {
    throw new Error(error.message);
  }

  const summary: WhatsAppSummary = {
    failed: 0,
    notifications: notifications?.length ?? 0,
    sent: 0,
    skipped: 0,
  };

  const sends: Promise<WhatsAppResult>[] = [];
  for (const notification of notifications ?? []) {
    const message = templateMessage(notification, fallbackLanguage);
    if (message) {
      sends.push(sender.send(message).catch((): WhatsAppResult => "failed"));
    } else {
      summary.skipped += 1;
    }
  }

  for (const result of await Promise.all(sends)) {
    if (result === "sent") {
      summary.sent += 1;
    } else {
      summary.failed += 1;
    }
  }

  return summary;
};
