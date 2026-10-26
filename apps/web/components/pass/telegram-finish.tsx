"use client";

import { identify, track } from "@repo/analytics/client";
import { EmailOtpForm } from "@repo/auth/components/email-otp-form";
import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuthMessages } from "@/lib/auth-messages";
import { useLinkTelegram } from "@/lib/telegram-login";

export type TelegramError =
  | "cancelled"
  | "failed"
  | "suspended"
  | "taken"
  | "unavailable";

interface TelegramFinishProps {
  readonly error: TelegramError | null;
  /** The Telegram first name, for a new account's welcome. */
  readonly name: string | null;
  /** An allowed return_to, or null for Your Pass. */
  readonly returnTo: string | null;
  /** A new account's ticket, linked once the member is signed in. */
  readonly ticket: string | null;
  /** A linked account's one-time sign-in token. */
  readonly tokenHash: string | null;
}

/** A linked account: the token signs in, then on to where they were going. */
const useTokenSignIn = (
  tokenHash: string | null,
  goOn: () => void,
  onError: () => void
) => {
  const { supabase } = useAuth();
  const started = useRef(false);
  useEffect(() => {
    if (!tokenHash || started.current) {
      return;
    }
    started.current = true;
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: "magiclink" })
      .then(({ data, error }) => {
        if (error || !data.user) {
          onError();
          return;
        }
        identify(data.user.id);
        track("login", { method: "telegram" });
        goOn();
      });
  }, [goOn, onError, supabase, tokenHash]);
};

/**
 * Finishes Telegram sign-in: signs a linked account in, links a new one to
 * the member who is signed in (or signs in with an email code first, for
 * receipts and recovery), or explains what went wrong.
 */
export const TelegramFinish = ({
  error: initialError,
  name,
  returnTo,
  ticket,
  tokenHash,
}: TelegramFinishProps) => {
  const t = useTranslations("pass.telegram");
  const locale = useLocale();
  const messages = useAuthMessages();
  const { loading, supabase, user } = useAuth();
  const link = useLinkTelegram();
  const linking = useRef(false);
  const [error, setError] = useState<TelegramError | null>(initialError);
  const destination = returnTo ?? localePath(locale, "/pass");
  const goOn = () => window.location.assign(destination);

  useTokenSignIn(tokenHash, goOn, () => setError("failed"));

  // Signed in with a ticket: link the account, then go on.
  useEffect(() => {
    if (!ticket || loading || !user || linking.current || error) {
      return;
    }
    linking.current = true;
    link.mutate(ticket, {
      onError: (failure) =>
        setError(
          "code" in failure && failure.code === "telegram_taken"
            ? "taken"
            : "failed"
        ),
      onSuccess: () => window.location.assign(destination),
    });
  }, [destination, error, link, loading, ticket, user]);

  if (error) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm" role="alert">
          {t(`errors.${error}`)}
        </p>
        <Button asChild variant="outline">
          <Link
            href={{
              pathname: "/sign-in",
              query: returnTo ? { return_to: returnTo } : undefined,
            }}
          >
            {t("back")}
          </Link>
        </Button>
      </div>
    );
  }

  if (ticket && !loading && !user) {
    return (
      <div className="grid gap-4">
        <p className="text-center text-muted-foreground text-sm">
          {name ? t("welcomeName", { name }) : t("welcome")}
        </p>
        <EmailOtpForm
          collectName={false}
          locale={locale}
          messages={messages}
          onSignedIn={(userId) => {
            identify(userId);
            track("login", { method: "telegram" });
          }}
          shouldCreateUser
          supabase={supabase}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center gap-2 text-sm"
      role="status"
    >
      <Spinner />
      {t("signingIn")}
    </div>
  );
};
