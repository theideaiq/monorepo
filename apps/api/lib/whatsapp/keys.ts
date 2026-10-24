import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const PHONE_NUMBER_ID = /^\d{5,20}$/;

/**
 * WhatsApp Cloud API (Meta). WhatsApp updates are off while the token or
 * the phone number id is unset. See ARCHITECTURE_AND_INTEGRATIONS.md,
 * "WhatsApp order updates".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG,
    },
    server: {
      // A System User's permanent token with whatsapp_business_messaging
      // (Meta Business Suite → Business settings → System users).
      WHATSAPP_ACCESS_TOKEN: z.string().min(20).optional(),
      // WhatsApp Manager → Phone numbers → the number's "Phone number ID".
      WHATSAPP_PHONE_NUMBER_ID: z.string().regex(PHONE_NUMBER_ID).optional(),
      // Template language for customers whose language has no template
      // (Kurdish): "ar" (default) or "en".
      WHATSAPP_TEMPLATE_LANG: z.enum(["ar", "en"]).default("ar"),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
