import type { Json } from "@repo/database";
import { formatDate } from "@repo/internationalization/format";
import ar from "@repo/internationalization/messages/ar.json" with {
  type: "json",
};
import en from "@repo/internationalization/messages/en.json" with {
  type: "json",
};
import type {
  TemplateMessage,
  WhatsAppLanguage,
  WhatsAppTemplate,
} from "./client";

/**
 * Which WhatsApp template (and its variables) carries a notification. The
 * templates and their texts are listed in ARCHITECTURE_AND_INTEGRATIONS.md
 * ("WhatsApp order updates"); the variables here must match them in order.
 */

const FALLBACK_TEXT: Record<WhatsAppLanguage, typeof en.store.whatsapp> = {
  ar: ar.store.whatsapp,
  en: en.store.whatsapp,
};

/** A notification claimed for WhatsApp (claim_whatsapp_notifications). */
export interface WhatsAppNotification {
  data: Json;
  event: string;
  first_name: string | null;
  locale: string | null;
  phone: string | null;
}

/** Which notification event goes out with which template. */
export const templateForEvent: Record<string, WhatsAppTemplate> = {
  order_paid: "order_confirmed",
  order_shipped: "order_shipped",
  rental_due_soon: "rental_due_soon",
};

/** Arabic and English have templates; other languages use the fallback. */
export const templateLanguage = (
  locale: string | null,
  fallback: WhatsAppLanguage
): WhatsAppLanguage => (locale === "ar" || locale === "en" ? locale : fallback);

const asRecord = (data: Json): Record<string, Json | undefined> =>
  data && typeof data === "object" && !Array.isArray(data) ? data : {};

const text = (value: Json | undefined) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

/**
 * The template message for a notification, or null when the event has no
 * template or the recipient has no number (or the data is incomplete).
 */
export const templateMessage = (
  notification: WhatsAppNotification,
  fallback: WhatsAppLanguage
): TemplateMessage | null => {
  const template = templateForEvent[notification.event];
  if (!(template && notification.phone)) {
    return null;
  }

  const language = templateLanguage(notification.locale, fallback);
  const strings = FALLBACK_TEXT[language];
  const data = asRecord(notification.data);
  const name = notification.first_name?.trim() || strings.customer;
  const number = text(data.number);

  let parameters: string[];
  switch (template) {
    case "order_confirmed":
      parameters = [name, `#${number}`];
      break;
    case "order_shipped":
      parameters = [
        name,
        `#${number}`,
        text(data.tracking) || strings.noTracking,
      ];
      break;
    case "rental_due_soon": {
      const english = text(data.name_en);
      const arabic = text(data.name_ar);
      const item = (language === "en" ? english : arabic) || english || arabic;
      const due = text(data.due_at);
      if (!(item && due)) {
        return null;
      }
      parameters = [name, item, formatDate(due, language)];
      break;
    }
    default:
      return null;
  }

  if (template !== "rental_due_soon" && !number) {
    return null;
  }

  return { language, parameters, template, to: notification.phone };
};
