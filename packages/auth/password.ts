import type { Database } from "@repo/database";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import {
  EMAIL_CODE_EXPIRY_SECONDS,
  normalizeEmail,
  type OtpErrorCode,
  toOtpErrorCode,
} from "./otp";

/**
 * Passwords for The IDEA Pass: signing in with an email and a password
 * (the default), getting a Pass with one confirmation code, and resetting a
 * forgotten password with an emailed code (no links: they break inside the
 * iOS/Android apps). The email code alone stays as the other way in.
 */

export type PasswordErrorCode =
  | OtpErrorCode
  | "wrong_password"
  | "weak_password"
  | "pwned_password"
  | "already_registered"
  | "unconfirmed"
  | "reauthentication_needed";

export type PasswordResult<T = undefined> =
  | { email: string; ok: true; value: T }
  | { code: PasswordErrorCode; message: string; ok: false };

/**
 * At least 8 characters with a lowercase and an uppercase letter, a digit
 * and a symbol: Supabase's strictest rule (Authentication → Sign In /
 * Providers → Email → Password requirements), checked here first so the
 * form can say what's missing.
 */
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt only reads the first 72 bytes.
const MAX_PASSWORD_LENGTH = 72;
// The character sets Supabase Auth checks.
const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /\d/;
const SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~\\]/;

/** What's wrong with a new password, or null when it's fine. */
export const passwordProblem = (
  password: string
): "too_short" | "too_long" | "character_mix" | null => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return "too_short";
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
    return "too_long";
  }
  const mix = [LOWER, UPPER, DIGIT, SYMBOL].every((set) => set.test(password));
  if (!mix) {
    return "character_mix";
  }
  return null;
};

// https://supabase.com/docs/guides/auth/debugging/error-codes
const passwordCodes: Record<string, PasswordErrorCode> = {
  email_exists: "already_registered",
  email_not_confirmed: "unconfirmed",
  invalid_credentials: "wrong_password",
  reauthentication_needed: "reauthentication_needed",
  reauthentication_not_valid: "invalid_code",
  same_password: "weak_password",
  user_already_exists: "already_registered",
  weak_password: "weak_password",
};

/** The error's code for the forms. */
export const toPasswordErrorCode = (
  error: Pick<AuthError, "code" | "status" | "message"> & {
    reasons?: string[];
  }
): PasswordErrorCode => {
  if (error.code === "weak_password" && error.reasons?.includes("pwned")) {
    return "pwned_password";
  }
  if (error.code && error.code in passwordCodes) {
    return passwordCodes[error.code] as PasswordErrorCode;
  }
  return toOtpErrorCode(error);
};

const failure = (error: AuthError): PasswordResult<never> => ({
  code: toPasswordErrorCode(error as AuthError & { reasons?: string[] }),
  message: error.message,
  ok: false,
});

const invalidEmail: PasswordResult<never> = {
  code: "invalid_email",
  message: "Enter a valid email address.",
  ok: false,
};

const weak: PasswordResult<never> = {
  code: "weak_password",
  message:
    "Use at least 8 characters with a lowercase and an uppercase letter, a digit and a symbol.",
  ok: false,
};

type Client = SupabaseClient<Database>;

/** Signs in with an email and password. */
export const signInWithPassword = async (
  supabase: Client,
  rawEmail: string,
  password: string,
  captchaToken?: string
): Promise<PasswordResult<{ userId: string }>> => {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return invalidEmail;
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    options: { captchaToken },
    password,
  });
  if (error) {
    return failure(error);
  }
  return { email, ok: true, value: { userId: data.user.id } };
};

/**
 * Starts a new Pass: Supabase emails a confirmation code (the sign-up
 * template shows the code only). An address that already has a Pass gets
 * no email and reads as `already_registered` (Supabase returns a user with
 * no identities instead of an error, so nobody can probe addresses through
 * the timing; the message only says what to do next).
 */
export const signUpWithPassword = async (
  supabase: Client,
  rawEmail: string,
  password: string,
  {
    captchaToken,
    fullName,
    locale,
  }: { captchaToken?: string; fullName: string; locale?: string }
): Promise<PasswordResult> => {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return invalidEmail;
  }
  if (passwordProblem(password)) {
    return weak;
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      captchaToken,
      data: { full_name: fullName.trim() || undefined, locale },
    },
    password,
  });
  if (error) {
    return failure(error);
  }
  if (data.user && (data.user.identities ?? []).length === 0) {
    return {
      code: "already_registered",
      message: "This email already has a Pass.",
      ok: false,
    };
  }
  return { email, ok: true, value: undefined };
};

/** The sign-up code: confirms the address and signs in. */
export const confirmSignUp = async (
  supabase: Client,
  email: string,
  token: string
): Promise<PasswordResult<{ userId: string }>> => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error || !data.user) {
    return error
      ? failure(error)
      : { code: "unknown", message: "Verification failed.", ok: false };
  }
  return { email, ok: true, value: { userId: data.user.id } };
};

/**
 * Emails a code to reset the password. Unknown addresses get no email but
 * the same answer, so the form doesn't reveal who has a Pass.
 */
export const sendPasswordReset = async (
  supabase: Client,
  rawEmail: string,
  captchaToken?: string
): Promise<PasswordResult> => {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    return invalidEmail;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
  });
  return error ? failure(error) : { email, ok: true, value: undefined };
};

/**
 * The reset code, then the new password: the code signs in (a recovery
 * session) and the password is set at once.
 */
export const resetPassword = async (
  supabase: Client,
  email: string,
  token: string,
  password: string
): Promise<PasswordResult<{ userId: string }>> => {
  if (passwordProblem(password)) {
    return weak;
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });
  if (error || !data.user) {
    return error
      ? failure(error)
      : { code: "unknown", message: "Verification failed.", ok: false };
  }
  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) {
    return failure(updated.error);
  }
  return { email, ok: true, value: { userId: data.user.id } };
};

/**
 * Sets or changes the signed-in person's password. When Supabase wants a
 * recent sign-in (secure password change), the result is
 * `reauthentication_needed`: send a code with `sendReauthenticationCode`
 * and call this again with it as `nonce`.
 */
export const setPassword = async (
  supabase: Client,
  password: string,
  nonce?: string
): Promise<PasswordResult> => {
  if (passwordProblem(password)) {
    return weak;
  }
  const { data, error } = await supabase.auth.updateUser({ nonce, password });
  if (error) {
    return failure(error);
  }
  return { email: data.user.email ?? "", ok: true, value: undefined };
};

/** Emails the signed-in person a code to confirm a password change. */
export const sendReauthenticationCode = async (
  supabase: Client
): Promise<PasswordResult> => {
  const { error } = await supabase.auth.reauthenticate();
  return error ? failure(error) : { email: "", ok: true, value: undefined };
};

/** How long the codes these emails carry last, in seconds. */
export const PASSWORD_CODE_EXPIRY_SECONDS = EMAIL_CODE_EXPIRY_SECONDS;
