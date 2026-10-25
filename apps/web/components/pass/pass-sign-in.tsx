"use client";

import { identify, track } from "@repo/analytics/client";
import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { useAuth } from "@repo/auth/provider";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuthMessages } from "@/lib/auth-messages";

interface PassSignInProps {
  readonly mode: "sign-in" | "sign-up";
  /** An allowed return_to (a path on this site or a URL), or null for My Pass. */
  readonly returnTo: string | null;
}

const LINK_CLASS =
  "font-medium text-foreground underline underline-offset-4 hover:no-underline";

/**
 * Email sign-in or sign-up (a 6-digit code by email). Sign-in only signs in
 * existing accounts and offers sign-up for an unknown address. The session
 * lands in the shared cookie, then the browser goes on to `returnTo` on
 * another site of The IDEA (a full navigation, so that site reads the new
 * cookie).
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
      <EmailOtpForm
        collectName={isSignUp}
        locale={locale}
        messages={messages}
        noAccount={() => (
          <Link className={LINK_CLASS} href={{ pathname: "/sign-up", query }}>
            {t("signIn.noAccountSignUp")}
          </Link>
        )}
        onSignedIn={(userId) => {
          identify(userId);
          track(isSignUp ? "sign_up" : "login", { method: "email" });
          // A full navigation, so the next page (or site) reads the cookie.
          window.location.assign(returnTo ?? localePath(locale, "/pass"));
        }}
        shouldCreateUser={isSignUp}
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
