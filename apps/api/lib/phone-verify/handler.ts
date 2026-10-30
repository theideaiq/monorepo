import { isIraqiMobile, normalizePhone } from "@repo/auth/phone";
import { z } from "zod";
import type { CheckResult, StartResult, VerifyChannel } from "./client";

/** Error codes the website translates; never raw messages. */
export type PhoneError =
  | "expired"
  | "invalid_phone"
  | "not_configured"
  | "not_iraqi"
  | "too_many"
  | "unavailable"
  | "wrong_code";

export interface PhoneResult {
  body:
    | { channel?: "sms" | "whatsapp"; ok: true; phone: string }
    | { error: PhoneError; ok: false };
  status: number;
}

export interface PhoneDeps {
  /** Our own limit per Pass (Upstash); undefined when unset. */
  limit?: (key: string) => Promise<boolean>;
  logError: (error: unknown) => void;
  /** Records the number as verified (admin client); after approval only. */
  save: (userId: string, phone: string) => Promise<void>;
  /** Twilio Verify; undefined while its keys are unset. */
  verify:
    | {
        check: (phone: string, code: string) => Promise<CheckResult>;
        start: (
          phone: string,
          locale: "ar" | "en",
          channel?: VerifyChannel
        ) => Promise<StartResult>;
      }
    | undefined;
}

const fail = (status: number, error: PhoneError): PhoneResult => ({
  body: { error, ok: false },
  status,
});

const startSchema = z.object({
  // Where the person wants the code: WhatsApp (the default) or SMS.
  channel: z.enum(["whatsapp", "sms"]).optional(),
  locale: z.enum(["ar", "en"]).default("ar"),
  phone: z.string().min(1).max(40),
});

const checkSchema = z.object({
  code: z.string().min(1).max(12),
  phone: z.string().min(1).max(40),
});

const readJson = (request: Request) => request.json().catch(() => null);

/** Sends a code to the number the Pass wants to verify. */
export const handlePhoneStart = async (
  request: Request,
  userId: string,
  deps: PhoneDeps
): Promise<PhoneResult> => {
  if (!deps.verify) {
    return fail(503, "not_configured");
  }
  const parsed = startSchema.safeParse(await readJson(request));
  const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
  if (!(parsed.success && phone)) {
    return fail(400, "invalid_phone");
  }
  // Codes go to Iraqi mobiles only: deliveries are in Iraq.
  if (!isIraqiMobile(phone)) {
    return fail(400, "not_iraqi");
  }
  if (deps.limit && !(await deps.limit(`phone-start:${userId}`))) {
    return fail(429, "too_many");
  }

  try {
    const result = await deps.verify.start(
      phone,
      parsed.data.locale,
      parsed.data.channel
    );
    if (result.status === "sent") {
      return {
        body: { channel: result.channel, ok: true, phone },
        status: 200,
      };
    }
    if (result.status === "failed") {
      return fail(502, "unavailable");
    }
    return fail(result.status === "too_many" ? 429 : 400, result.status);
  } catch (error) {
    deps.logError(error);
    return fail(502, "unavailable");
  }
};

/** Checks the code; an approved number is saved for the Pass. */
export const handlePhoneCheck = async (
  request: Request,
  userId: string,
  deps: PhoneDeps
): Promise<PhoneResult> => {
  if (!deps.verify) {
    return fail(503, "not_configured");
  }
  const parsed = checkSchema.safeParse(await readJson(request));
  const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
  if (!(parsed.success && phone)) {
    return fail(400, "invalid_phone");
  }
  if (deps.limit && !(await deps.limit(`phone-check:${userId}`))) {
    return fail(429, "too_many");
  }

  try {
    const result = await deps.verify.check(phone, parsed.data.code.trim());
    if (result === "approved") {
      await deps.save(userId, phone);
      return { body: { ok: true, phone }, status: 200 };
    }
    if (result === "failed") {
      return fail(502, "unavailable");
    }
    return fail(result === "too_many" ? 429 : 400, result);
  } catch (error) {
    deps.logError(error);
    return fail(502, "unavailable");
  }
};
