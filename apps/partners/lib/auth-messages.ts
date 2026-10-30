"use client";

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
      phone_taken: t("errors.phone_taken"),
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
