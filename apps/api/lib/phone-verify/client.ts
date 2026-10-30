/**
 * A small client for Twilio Verify: send a code, then check it. No SDK;
 * `fetch` is injectable for tests. Twilio keeps the code, its expiry and
 * the attempt limits; we never see the code it sent.
 */

const VERIFY_API = "https://verify.twilio.com/v2";

export type VerifyChannel = "whatsapp" | "sms";

export interface VerifyConfig {
  accountSid: string;
  authToken: string;
  fetch?: typeof fetch;
  serviceSid: string;
}

/**
 * `sent`: a code is on its way (`channel` says how). `invalid_phone`:
 * Twilio can't reach the number. `too_many`: Twilio's own limits for the
 * number were reached.
 */
export type StartResult =
  | { channel: VerifyChannel; status: "sent" }
  | { status: "invalid_phone" | "too_many" | "failed" };

/** `expired`: no code is waiting (expired, used or never sent). */
export type CheckResult =
  | "approved"
  | "wrong_code"
  | "expired"
  | "too_many"
  | "failed";

interface TwilioBody {
  code?: number;
  status?: string;
}

// Twilio error codes: 60200 invalid parameter (the number), 60205 SMS to a
// landline, 60203 too many sends, 60202 too many checks, 20404 no pending
// verification (expired or already approved).
const INVALID_PHONE = new Set([60_200, 60_205]);
const TOO_MANY = new Set([60_202, 60_203]);
const NOT_FOUND = 20_404;

const request = async (
  config: VerifyConfig,
  path: string,
  form: Record<string, string>
): Promise<{ body: TwilioBody; ok: boolean; status: number }> => {
  const response = await (config.fetch ?? fetch)(
    `${VERIFY_API}/Services/${config.serviceSid}/${path}`,
    {
      body: new URLSearchParams(form),
      headers: {
        Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
      },
      method: "POST",
    }
  );
  const body = (await response.json().catch(() => ({}))) as TwilioBody;
  return { body, ok: response.ok, status: response.status };
};

const sendOn = async (
  config: VerifyConfig,
  to: string,
  channel: VerifyChannel,
  locale: string
): Promise<StartResult> => {
  const { body, ok, status } = await request(config, "Verifications", {
    Channel: channel,
    Locale: locale,
    To: to,
  });
  if (ok) {
    return { channel, status: "sent" };
  }
  if (status === 429 || TOO_MANY.has(body.code ?? 0)) {
    return { status: "too_many" };
  }
  if (INVALID_PHONE.has(body.code ?? 0)) {
    return { status: "invalid_phone" };
  }
  return { status: "failed" };
};

/**
 * Sends a code to `to` (E.164) where the person chose: by SMS, or on
 * WhatsApp (the default), falling back to SMS when WhatsApp can't deliver
 * it (no WhatsApp sender yet, or the number isn't on WhatsApp).
 */
export const startVerification = async (
  config: VerifyConfig,
  to: string,
  locale: "ar" | "en",
  channel: VerifyChannel = "whatsapp"
): Promise<StartResult> => {
  if (channel === "sms") {
    return sendOn(config, to, "sms", locale);
  }
  const whatsapp = await sendOn(config, to, "whatsapp", locale);
  if (whatsapp.status === "failed" || whatsapp.status === "invalid_phone") {
    return sendOn(config, to, "sms", locale);
  }
  return whatsapp;
};

const CODE = /^\d{4,10}$/;

/** Checks the code the person typed for `to`. */
export const checkVerification = async (
  config: VerifyConfig,
  to: string,
  code: string
): Promise<CheckResult> => {
  if (!CODE.test(code)) {
    return "wrong_code";
  }
  const { body, ok, status } = await request(config, "VerificationCheck", {
    Code: code,
    To: to,
  });
  if (ok) {
    return body.status === "approved" ? "approved" : "wrong_code";
  }
  if (status === 404 || body.code === NOT_FOUND) {
    return "expired";
  }
  if (status === 429 || TOO_MANY.has(body.code ?? 0)) {
    return "too_many";
  }
  return "failed";
};
