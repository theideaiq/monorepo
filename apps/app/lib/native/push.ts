import type { Database } from "@repo/database";
import {
  currentAppPath,
  safeNextPath,
} from "@repo/internationalization/app-paths";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callApi } from "../api";
import { detectPlatform } from "../platform";

/**
 * Push notifications in the iOS/Android apps (`@capacitor/push-notifications`).
 * No-ops on the web. The token is an FCM registration token on both
 * platforms (iOS hands over the FCM token, not the raw APNs one; see
 * ARCHITECTURE_AND_INTEGRATIONS.md, "Push notifications"), sent to
 * `POST /push/register` on apps/api with the user's access token.
 */

type Client = SupabaseClient<Database>;

interface PushOptions {
  /** Called with the app path of a tapped notification, e.g. `/orders`. */
  onOpen: (path: string) => void;
  supabase: Client;
}

let lastToken: string | null = null;

/**
 * Asks for permission (once; the system remembers the answer), registers
 * the device and routes taps on notifications into the app. Call it after
 * sign-in. Returns a cleanup that removes the listeners.
 */
export const registerPushNotifications = async ({
  onOpen,
  supabase,
}: PushOptions): Promise<() => void> => {
  const platform = detectPlatform();
  if (platform === "web") {
    return () => undefined;
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive.startsWith("prompt")) {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    return () => undefined;
  }

  const listeners = await Promise.all([
    PushNotifications.addListener("registration", ({ value }) => {
      lastToken = value;
      callApi(supabase, "/push/register", { platform, token: value }).catch(
        () => undefined
      );
    }),
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      ({ notification }) => {
        const data = notification.data as
          | { event?: string; link?: string }
          | undefined;
        const link = safeNextPath(data?.link);
        onOpen(link ? currentAppPath(link, { event: data?.event }) : "/");
      }
    ),
  ]);

  await PushNotifications.register();

  return () => {
    for (const listener of listeners) {
      listener.remove();
    }
  };
};

/**
 * Removes this device from the signed-in account. Call it just before
 * signing out (it needs the session), so the next person on this phone
 * doesn't get the previous account's notifications.
 */
export const unregisterPushNotifications = async (supabase: Client) => {
  if (detectPlatform() === "web" || !lastToken) {
    return;
  }
  const token = lastToken;
  lastToken = null;
  await callApi(supabase, "/push/unregister", { token }).catch(() => undefined);
};
