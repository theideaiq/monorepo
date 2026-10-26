import type { Database } from "@repo/database";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "./phone";

/**
 * One-time codes for The IDEA Pass. People sign in with an 8-digit code sent
 * by email (`sendEmailOtp` / `verifyEmailOtp`). The phone code path
 * (`sendPhoneOtp` / `verifyPhoneOtp`) is kept for when phone sign-in comes
 * back, but the phone provider is switched off (supabase/config.toml).
 */

export type OtpChannel = "sms" | "whatsapp";

export type OtpErrorCode =
  | "invalid_email"
  | "invalid_phone"
  | "rate_limited"
  | "invalid_code"
  | "expired_code"
  | "no_account"
  | "captcha_failed"
  | "signups_disabled"
  | "delivery_failed"
  | "unknown";

export type OtpResult<T = undefined> =
  | { ok: true; phone: string; value: T }
  | OtpFailure;

export interface OtpFailure {
  code: OtpErrorCode;
  message: string;
  ok: false;
}

export type EmailOtpResult<T = undefined> =
  | { email: string; ok: true; value: T }
  | OtpFailure;

/** Digits in an email code (`otp_length` in supabase/config.toml). */
export const EMAIL_CODE_LENGTH = 8;
/** How long an email code is valid, in seconds (`otp_expiry`). */
export const EMAIL_CODE_EXPIRY_SECONDS = 600;

// https://supabase.com/docs/guides/auth/debugging/error-codes
const errorCodes: Record<string, OtpErrorCode> = {
  captcha_failed: "captcha_failed",
  email_address_invalid: "invalid_email",
  email_address_not_authorized: "delivery_failed",
  email_provider_disabled: "delivery_failed",
  otp_disabled: "signups_disabled",
  // Supabase answers a wrong code and an expired one alike.
  otp_expired: "invalid_code",
  over_email_send_rate_limit: "rate_limited",
  over_request_rate_limit: "rate_limited",
  over_sms_send_rate_limit: "rate_limited",
  phone_provider_disabled: "delivery_failed",
  signup_disabled: "signups_disabled",
  sms_send_failed: "delivery_failed",
  validation_failed: "invalid_phone",
};

export const toOtpErrorCode = (error: Pick<AuthError, "code" | "status">) => {
  if (error.code && error.code in errorCodes) {
    return errorCodes[error.code] as OtpErrorCode;
  }
  return error.status === 429 ? "rate_limited" : "unknown";
};

const failure = (error: AuthError): OtpResult<never> => ({
  code: toOtpErrorCode(error),
  message: error.message,
  ok: false,
});

const invalidPhone: OtpResult<never> = {
  code: "invalid_phone",
  message: "Enter a valid phone number.",
  ok: false,
};

interface SendOtpOptions {
  captchaToken?: string;
  channel?: OtpChannel;
  /** Stored on new accounts only; becomes the profile's display name. */
  fullName?: string;
  locale?: string;
  /** Set to false to only allow existing users to sign in. */
  shouldCreateUser?: boolean;
}

/**
 * Sends a one-time code to the phone number (SMS by default). Switched off
 * for now: needs the phone provider (or the Send SMS hook) enabled.
 */
export const sendPhoneOtp = async (
  supabase: SupabaseClient<Database>,
  rawPhone: string,
  {
    captchaToken,
    channel = "sms",
    fullName,
    locale,
    shouldCreateUser = true,
  }: SendOtpOptions = {}
): Promise<OtpResult> => {
  const phone = normalizePhone(rawPhone);

  if (!phone) {
    return invalidPhone;
  }

  const { error } = await supabase.auth.signInWithOtp({
    options: {
      captchaToken,
      channel,
      data: { full_name: fullName?.trim() || undefined, locale },
      shouldCreateUser,
    },
    phone,
  });

  return error ? failure(error) : { ok: true, phone, value: undefined };
};

/** Verifies the code; on success the client holds a signed-in session. */
export const verifyPhoneOtp = async (
  supabase: SupabaseClient<Database>,
  phone: string,
  token: string
): Promise<OtpResult<{ userId: string }>> => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return failure(error);
  }

  if (!data.user) {
    return { code: "unknown", message: "Verification failed.", ok: false };
  }

  return { ok: true, phone, value: { userId: data.user.id } };
};

// Deliberately loose: the server has the final say (validation_failed).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;

/** Trims and lowercases an address; null when it can't be one. */
export const normalizeEmail = (input: string): string | null => {
  const email = input.trim().toLowerCase();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL.test(email) ? email : null;
};

const invalidEmail: OtpFailure = {
  code: "invalid_email",
  message: "Enter a valid email address.",
  ok: false,
};

const emailFailure = (
  error: AuthError,
  shouldCreateUser = true
): OtpFailure => {
  let code = toOtpErrorCode(error);
  if (error.code === "validation_failed") {
    code = "invalid_email";
  }
  // With shouldCreateUser: false, "signups not allowed" means there is no
  // account with this address yet.
  if (!shouldCreateUser && code === "signups_disabled") {
    code = "no_account";
  }
  return { code, message: error.message, ok: false };
};

interface SendEmailOtpOptions {
  captchaToken?: string;
  /**
   * Where the email's link lands (an allowed redirect URL in Supabase). The
   * templates show the code, but a project still on Supabase's default
   * templates sends a link; it then signs people in through this page.
   */
  emailRedirectTo?: string;
  /** Stored on new accounts only; becomes the profile's display name. */
  fullName?: string;
  locale?: string;
  /** false: existing accounts only (an unknown address is `no_account`). */
  shouldCreateUser?: boolean;
}

/**
 * Emails an 8-digit code. Supabase sends its confirmation email to a new
 * address and its "magic link" email to an existing one; both templates
 * (supabase/templates) show only the code.
 */
export const sendEmailOtp = async (
  supabase: SupabaseClient<Database>,
  rawEmail: string,
  {
    captchaToken,
    emailRedirectTo,
    fullName,
    locale,
    shouldCreateUser = true,
  }: SendEmailOtpOptions = {}
): Promise<EmailOtpResult> => {
  const email = normalizeEmail(rawEmail);

  if (!email) {
    return invalidEmail;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      captchaToken,
      data: { full_name: fullName?.trim() || undefined, locale },
      emailRedirectTo,
      shouldCreateUser,
    },
  });

  return error
    ? emailFailure(error, shouldCreateUser)
    : { email, ok: true, value: undefined };
};

interface VerifyEmailOtpOptions {
  /** The code's lifetime in seconds, to tell an expired code from a wrong one. */
  expiresInSeconds?: number;
  now?: number;
  /** When the code was sent (ms since the epoch). */
  sentAt?: number;
}

/** Verifies an email code; on success the client holds a signed-in session. */
export const verifyEmailOtp = async (
  supabase: SupabaseClient<Database>,
  email: string,
  token: string,
  {
    expiresInSeconds = EMAIL_CODE_EXPIRY_SECONDS,
    now = Date.now(),
    sentAt,
  }: VerifyEmailOtpOptions = {}
): Promise<EmailOtpResult<{ isNew: boolean; userId: string }>> => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    const result = emailFailure(error);
    const expired =
      sentAt !== undefined && now - sentAt >= expiresInSeconds * 1000;
    return expired && result.code === "invalid_code"
      ? { ...result, code: "expired_code" }
      : result;
  }

  if (!data.user) {
    return { code: "unknown", message: "Verification failed.", ok: false };
  }

  // A Pass created by the code just sent: its row is no older than the code.
  const createdAt = Date.parse(data.user.created_at ?? "");
  const isNew = now - createdAt <= expiresInSeconds * 1000;
  return { email, ok: true, value: { isNew, userId: data.user.id } };
};
