import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushResult, PushSender } from "./fcm";
import { pushText } from "./text";

export interface PushSummary {
  failed: number;
  notifications: number;
  removed: number;
  sent: number;
}

/**
 * Pushes unpushed notifications to their recipients' devices.
 *
 * `claim_push_notifications` marks the rows as pushed in the same statement
 * that returns them, so the database webhook and the catch-up cron never
 * send one twice (a failed send is not retried: the notification is still
 * in the app). Devices FCM no longer knows are removed.
 *
 * `ids` limits the run to those notifications (the webhook); without it the
 * oldest unpushed notifications of the last day are sent (the cron).
 */
export const deliverPushNotifications = async (
  admin: SupabaseClient<Database>,
  sender: PushSender,
  ids?: string[]
): Promise<PushSummary> => {
  const { data: notifications, error } = await admin.rpc(
    "claim_push_notifications",
    ids ? { notification_ids: ids } : {}
  );
  if (error) {
    throw new Error(error.message);
  }

  const summary: PushSummary = {
    failed: 0,
    notifications: notifications?.length ?? 0,
    removed: 0,
    sent: 0,
  };
  if (!notifications?.length) {
    return summary;
  }

  const userIds = [...new Set(notifications.map(({ user_id }) => user_id))];
  const { data: devices, error: devicesError } = await admin
    .from("push_devices")
    .select("token, user_id")
    .in("user_id", userIds);
  if (devicesError) {
    throw new Error(devicesError.message);
  }

  const invalid = new Set<string>();
  const sends: Promise<PushResult>[] = [];

  for (const notification of notifications) {
    const { body, title } = pushText(notification, notification.locale);
    const data: Record<string, string> = {
      notificationId: notification.id,
      ...(notification.link
        ? { event: notification.event, link: notification.link }
        : {}),
    };
    for (const device of devices ?? []) {
      if (device.user_id !== notification.user_id) {
        continue;
      }
      sends.push(
        sender
          .send({ body, data, title, token: device.token })
          .catch((): PushResult => "failed")
          .then((result) => {
            if (result === "invalid_token") {
              invalid.add(device.token);
            }
            return result;
          })
      );
    }
  }

  for (const result of await Promise.all(sends)) {
    if (result === "sent") {
      summary.sent += 1;
    } else if (result === "failed") {
      summary.failed += 1;
    }
  }

  if (invalid.size) {
    await admin
      .from("push_devices")
      .delete()
      .in("token", [...invalid]);
    summary.removed = invalid.size;
  }

  return summary;
};
