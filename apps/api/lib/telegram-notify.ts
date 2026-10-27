import type { Database } from "@repo/database";
import { type DroidBot, notifyMember } from "@repo/droid";
import { localePath } from "@repo/internationalization";
import {
  businessPath,
  currentAppPath,
  safeNextPath,
} from "@repo/internationalization/app-paths";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { pushText } from "./push/text";

export interface TelegramSummary {
  blocked: number;
  failed: number;
  sent: number;
}

/**
 * Where a notification opens, in the member's language: a page of The IDEA
 * Business on its site (`/business/invoices` → `/organization/invoices` there), anything
 * else on the website.
 */
export const notificationUrl = (link: string | null, locale: "ar" | "en") => {
  const path = safeNextPath(link);
  const business = path ? businessPath(path) : null;
  return business
    ? new URL(localePath(locale, business), env.NEXT_PUBLIC_APP_URL).toString()
    : new URL(
        localePath(locale, path ? currentAppPath(path) : "/pass"),
        env.NEXT_PUBLIC_WEB_URL
      ).toString();
};

/**
 * Sends unsent notifications to members who linked Telegram, as a message
 * from Droid with a button to open them. `claim_telegram_notifications`
 * marks them sent in the same statement, so the webhook and the catch-up
 * cron never send one twice (a failed send stays in the app).
 */
export const deliverTelegramNotifications = async (
  admin: SupabaseClient<Database>,
  bot: DroidBot,
  ids?: string[]
): Promise<TelegramSummary> => {
  const { data: notifications, error } = await admin.rpc(
    "claim_telegram_notifications",
    ids ? { notification_ids: ids } : {}
  );
  if (error) {
    throw new Error(error.message);
  }
  const summary: TelegramSummary = { blocked: 0, failed: 0, sent: 0 };
  for (const notification of notifications ?? []) {
    const locale = notification.locale === "en" ? "en" : "ar";
    const { body, title } = pushText(notification, locale);
    try {
      // biome-ignore lint/performance/noAwaitInLoops: one message at a time stays under Telegram's rate limits
      const delivered = await notifyMember(bot.api, {
        body,
        locale,
        telegramId: notification.telegram_id,
        title,
        url: notificationUrl(notification.link, locale),
      });
      summary[delivered ? "sent" : "blocked"] += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
};
