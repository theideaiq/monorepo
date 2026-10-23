"use client";

import { PhoneOtpForm } from "@repo/auth/components/phone-otp-form";
import { useLocale } from "next-intl";
import { useAuthMessages } from "@/components/auth-messages";

/**
 * The product's phone sign-in (one-time code by SMS). The cookie session it
 * creates is read by the server; the console then asks for the
 * authenticator app and checks the staff role.
 */
export const SignInForm = () => {
  const locale = useLocale();
  const messages = useAuthMessages();

  return (
    <PhoneOtpForm locale={locale} messages={messages} redirectTo={`/${locale}`} />
  );
};
