"use client";

import { identify, track } from "@repo/analytics/client";
import { PhoneOtpForm } from "@repo/auth/components/phone-otp-form";
import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";

interface PassSignInProps {
  readonly mode: "sign-in" | "sign-up";
  /** An allowed return_to (a Spark path or URL), or null for "Your Pass". */
  readonly returnTo: string | null;
}

/**
 * Phone sign-in or sign-up (one-time code by SMS). The session lands in the
 * shared cookie, then the browser goes on to `returnTo` on another site of
 * The IDEA (a full navigation, so that site reads the new cookie).
 */
export const PassSignIn = ({ mode, returnTo }: PassSignInProps) => {
  const t = useTranslations("pass");
  const locale = useLocale();
  const messages = useAuthMessages();
  const { supabase } = useAuth();
  const isSignUp = mode === "sign-up";
  const query = returnTo ? { return_to: returnTo } : undefined;

  return (
    <div className="grid gap-6">
      <PhoneOtpForm
        collectName={isSignUp}
        locale={locale}
        messages={messages}
        onSignedIn={(userId) => {
          identify(userId);
          track(isSignUp ? "sign_up" : "login", { method: "phone" });
          // A full navigation, so the next page (or site) reads the cookie.
          window.location.assign(returnTo ?? `/${locale}/pass`);
        }}
        supabase={supabase}
      />
      <p className="text-center text-muted-foreground text-sm">
        {isSignUp ? t("signUp.haveAccount") : t("signIn.noAccount")}{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={{
            pathname: isSignUp ? "/sign-in" : "/sign-up",
            query,
          }}
        >
          {isSignUp ? t("signUp.signInLink") : t("signIn.signUpLink")}
        </Link>
      </p>
    </div>
  );
};
