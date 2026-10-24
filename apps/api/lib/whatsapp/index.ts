import "server-only";

import { log } from "@repo/observability/log";
import { env } from "@/env";
import { createWhatsAppSender, type WhatsAppSender } from "./client";

let sender: WhatsAppSender | null | undefined;

/**
 * The WhatsApp sender, or null while WHATSAPP_ACCESS_TOKEN or
 * WHATSAPP_PHONE_NUMBER_ID is unset (WhatsApp updates are off).
 */
export const getWhatsAppSender = (): WhatsAppSender | null => {
  if (sender === undefined) {
    sender =
      env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
        ? createWhatsAppSender({
            accessToken: env.WHATSAPP_ACCESS_TOKEN,
            onError: (reason) => log.warn(reason),
            phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
          })
        : null;
  }
  return sender;
};

/** The template language for customers without an ar/en template. */
export const whatsappFallbackLanguage = (): "ar" | "en" =>
  // Unvalidated (SKIP_ENV_VALIDATION) environments skip the default.
  env.WHATSAPP_TEMPLATE_LANG === "en" ? "en" : "ar";
