import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const ACCOUNT_SID = /^AC[0-9a-f]{32}$/;
const SERVICE_SID = /^VA[0-9a-f]{32}$/;

/**
 * Twilio Verify: the codes that prove a Pass owns a phone number (WhatsApp
 * first, SMS as the fallback). Phone verification answers "not
 * configured" while any of these is unset. See
 * ARCHITECTURE_AND_INTEGRATIONS.md, "Phone verification".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
    },
    server: {
      // Twilio Console → Account info.
      TWILIO_ACCOUNT_SID: z.string().regex(ACCOUNT_SID).optional(),
      TWILIO_AUTH_TOKEN: z.string().min(16).optional(),
      // Twilio Console → Verify → Services → the service's SID.
      TWILIO_VERIFY_SERVICE_SID: z.string().regex(SERVICE_SID).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
