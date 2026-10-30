"use client";

import { identify, track } from "@repo/analytics/client";
import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { PasswordForm } from "@repo/auth/components/password-form";
import { useTurnstile } from "@repo/auth/components/turnstile";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuthMessages, usePasswordMessages } from "@/lib/auth-messages";

interface PassSignInProps {
  /** An allowed return_to (a path on this site or a URL), or null for Your Pass. */
  readonly returnTo: string | null;
  /** Cloudflare Turnstile's site key, when the security check is on. */
  readonly turnstileSiteKey?: string;
}

/**
 * Signing in to The IDEA Pass: an email and password by default (getting
 * a Pass takes one emailed code; a forgotten password is reset with
 * another), or an emailed code alone. The session lands in the shared
 * cookie, then the browser goes on to `returnTo` on another site of The
 * IDEA (a full navigation, so that site reads the new cookie).
 */
export const PassSignIn = ({ returnTo, turnstileSiteKey }: PassSignInProps) => {
  const locale = useLocale();
  const t = useTranslations("auth.password");
  const messages = useAuthMessages();
  const passwordMessages = usePasswordMessages();
  const { supabase } = useAuth();
  const turnstile = useTurnstile(turnstileSiteKey, locale);
  const [withCode, setWithCode] = useState(false);

  const signedIn =
    (method: "email" | "password") => (userId: string, isNew: boolean) => {
      identify(userId);
      track(isNew ? "sign_up" : "login", { method });
      // A full navigation, so the next page (or site) reads the cookie.
      window.location.assign(returnTo ?? localePath(locale, "/pass"));
    };

  return (
    <div className="grid gap-4">
      {withCode ? (
        <>
          <EmailOtpForm
            getCaptchaToken={turnstile.getToken}
            locale={locale}
            messages={messages}
            onSignedIn={signedIn("email")}
            supabase={supabase}
          />
          <Button
            className="justify-self-center"
            onClick={() => setWithCode(false)}
            type="button"
            variant="link"
          >
            {t("usePassword")}
          </Button>
        </>
      ) : (
        <PasswordForm
          getCaptchaToken={turnstile.getToken}
          locale={locale}
          messages={passwordMessages}
          onSignedIn={signedIn("password")}
          onUseCode={() => setWithCode(true)}
          supabase={supabase}
        />
      )}
      {turnstile.element}
    </div>
  );
};
