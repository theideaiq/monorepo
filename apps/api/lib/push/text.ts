import ar from "@repo/internationalization/messages/ar.json" with {
  type: "json",
};
import en from "@repo/internationalization/messages/en.json" with {
  type: "json",
};

type NotificationMessages = typeof en.store.notifications;

const MESSAGES: Record<"ar" | "en", NotificationMessages> = {
  ar: ar.store.notifications,
  en: en.store.notifications,
};

/**
 * The push title and body for a notification, in the recipient's language
 * (profiles.locale; Kurdish falls back to Arabic, like the app). The title
 * is the same as in the app's notification list; the body stays generic so
 * order numbers, product names and ticket subjects never show on a locked
 * screen. Tapping opens the full notification in the app.
 */
export const pushText = (
  notification: { event: string; kind: string },
  locale: string
) => {
  const messages = MESSAGES[locale === "en" ? "en" : "ar"];
  const events = messages.events as Record<string, { title: string }>;
  const kinds = messages.kinds as Record<string, string>;
  return {
    body: messages.fallbackBody,
    title:
      events[notification.event]?.title ??
      kinds[notification.kind] ??
      kinds.system,
  };
};
