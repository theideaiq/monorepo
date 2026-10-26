"use client";

import { identify, track } from "@repo/analytics/client";
import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { useAuth } from "@repo/auth/provider";
import { localePath } from "@repo/internationalization";
import { useLocale } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";

interface PassSignInProps {
  /** An allowed return_to (a path on this site or a URL), or null for My Pass. */
  readonly returnTo: string | null;
}

/**
 * Email sign-in with a code by email: an address we know signs in, a new
 * one gets its Pass (onboarding then asks for the name). The session lands
 * in the shared cookie, then the browser goes on to `returnTo` on another
 * site of The IDEA (a full navigation, so that site reads the new cookie).
 */
export const PassSignIn = ({ returnTo }: PassSignInProps) => {
  const locale = useLocale();
  const messages = useAuthMessages();
  const { supabase } = useAuth();

  return (
    <EmailOtpForm
      locale={locale}
      messages={messages}
      onSignedIn={(userId, isNew) => {
        identify(userId);
        track(isNew ? "sign_up" : "login", { method: "email" });
        // A full navigation, so the next page (or site) reads the cookie.
        window.location.assign(returnTo ?? localePath(locale, "/pass"));
      }}
      supabase={supabase}
    />
  );
};
