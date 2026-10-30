import type { OtpErrorCode } from "./otp";

/**
 * Texts used by the auth components. English defaults live here; apps pass
 * translated messages (see the `auth` namespace in @repo/internationalization).
 */
export interface AuthMessages {
  changeEmail: string;
  codeHint: string;
  codeLabel: string;
  continue: string;
  createOrganization: string;
  emailCodeSentTo: string;
  emailHint: string;
  emailLabel: string;
  emailPlaceholder: string;
  errors: Record<OtpErrorCode, string>;
  fullNameLabel: string;
  nameRequired: string;
  organizations: string;
  resend: string;
  resendIn: string;
  sending: string;
  signOut: string;
  verify: string;
  verifying: string;
}

export const defaultAuthMessages: AuthMessages = {
  changeEmail: "Use a different email",
  codeHint: "Can't find it? Check your spam folder.",
  codeLabel: "Verification code",
  continue: "Continue",
  createOrganization: "Create organization",
  emailCodeSentTo: "We emailed an 8-digit code to {email}.",
  emailHint: "We'll email you an 8-digit code. No password needed.",
  emailLabel: "Email",
  emailPlaceholder: "name@example.com",
  errors: {
    captcha_failed: "Please complete the security check and try again.",
    delivery_failed: "We couldn't send the code. Please try again shortly.",
    expired_code: "That code has expired. Send a new one.",
    invalid_code: "That code is incorrect or has expired.",
    invalid_email: "Enter a valid email address, e.g. name@example.com.",
    invalid_phone: "Enter a valid mobile number, e.g. 0770 123 4567.",
    no_account: "There's no Pass with this email yet.",
    phone_taken: "This number is verified on another Pass.",
    rate_limited: "Too many attempts. Please wait a moment and try again.",
    signups_disabled: "New sign-ups are currently closed.",
    unknown: "Something went wrong. Please try again.",
  },
  fullNameLabel: "Full name",
  nameRequired: "Enter your name.",
  organizations: "Organizations",
  resend: "Resend code",
  resendIn: "Resend code in {seconds}s",
  sending: "Sending…",
  signOut: "Sign out",
  verify: "Verify",
  verifying: "Verifying…",
};

const PLACEHOLDER = /\{(\w+)\}/g;

/** Replaces `{name}` placeholders in a message. */
export const format = (
  message: string,
  values: Record<string, string | number>
) =>
  message.replace(PLACEHOLDER, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
