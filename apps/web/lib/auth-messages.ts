"use client";

import type { PasswordMessages } from "@repo/auth/components/password-form";
import type { AuthMessages } from "@repo/auth/messages";
import { useTranslations } from "next-intl";

/** The auth components' texts from the `auth` messages. */
export const useAuthMessages = (): AuthMessages => {
  const t = useTranslations("auth");

  return {
    changeEmail: t("changeEmail"),
    codeHint: t("codeHint"),
    codeLabel: t("codeLabel"),
    continue: t("continue"),
    createOrganization: t("createOrganization"),
    // The component fills in {email} and {seconds} itself.
    emailCodeSentTo: t.raw("emailCodeSentTo") as string,
    emailHint: t("emailHint"),
    emailLabel: t("emailLabel"),
    emailPlaceholder: t("emailPlaceholder"),
    errors: {
      captcha_failed: t("errors.captcha_failed"),
      delivery_failed: t("errors.delivery_failed"),
      expired_code: t("errors.expired_code"),
      invalid_code: t("errors.invalid_code"),
      invalid_email: t("errors.invalid_email"),
      invalid_phone: t("errors.invalid_phone"),
      no_account: t("errors.no_account"),
      rate_limited: t("errors.rate_limited"),
      signups_disabled: t("errors.signups_disabled"),
      unknown: t("errors.unknown"),
    },
    fullNameLabel: t("fullNameLabel"),
    nameRequired: t("nameRequired"),
    organizations: t("organizations"),
    resend: t("resend"),
    resendIn: t.raw("resendIn") as string,
    sending: t("sending"),
    signOut: t("signOut"),
    verify: t("verify"),
    verifying: t("verifying"),
  };
};

const PASSWORD_ERRORS = [
  "already_registered",
  "captcha_failed",
  "delivery_failed",
  "expired_code",
  "invalid_code",
  "invalid_email",
  "invalid_phone",
  "name_required",
  "no_account",
  "pwned_password",
  "rate_limited",
  "reauthentication_needed",
  "signups_disabled",
  "unconfirmed",
  "unknown",
  "weak_password",
  "wrong_password",
] as const;

/** The password forms' texts from the `auth.password` messages. */
export const usePasswordMessages = (): PasswordMessages => {
  const t = useTranslations("auth.password");
  return {
    back: t("back"),
    codeHint: t("codeHint"),
    codeLabel: t("codeLabel"),
    // The component fills in {email} itself.
    codeSentTo: t.raw("codeSentTo") as string,
    confirm: t("confirm"),
    createPass: t("createPass"),
    emailLabel: t("emailLabel"),
    errors: Object.fromEntries(
      PASSWORD_ERRORS.map((code) => [code, t(`errors.${code}`)])
    ) as PasswordMessages["errors"],
    forgot: t("forgot"),
    forgotHint: t("forgotHint"),
    fullNameLabel: t("fullNameLabel"),
    haveOne: t("haveOne"),
    newHere: t("newHere"),
    newPassword: t("newPassword"),
    passwordHint: t("passwordHint"),
    passwordLabel: t("passwordLabel"),
    resetDone: t("resetDone"),
    resetTitle: t("resetTitle"),
    sendCode: t("sendCode"),
    setPassword: t("setPassword"),
    signIn: t("signIn"),
    signUpTitle: t("signUpTitle"),
    useCode: t("useCode"),
    working: t("working"),
  };
};
