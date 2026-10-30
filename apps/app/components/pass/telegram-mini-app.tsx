"use client";

import { useAuth } from "@repo/auth/provider";
import type { SocialProvider } from "@repo/auth/social";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { SocialButtons } from "@/components/pass/social-buttons";

/** The parts of Telegram's Web App object the Mini App uses. */
interface TelegramWebApp {
  expand: () => void;
  ready: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const ready = () => {
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
};

/**
 * The Droid's Mini App: Telegram opens the website at /tg. A signed-in
 * Pass goes straight to the store; otherwise "Continue with Telegram"
 * (Supabase Auth, the Telegram the Pass connected), signing in with email,
 * or browsing as a guest.
 */
export const TelegramMiniApp = ({
  providers,
}: {
  /** The sign-in providers turned on (NEXT_PUBLIC_AUTH_PROVIDERS). */
  readonly providers: SocialProvider[];
}) => {
  const t = useTranslations("pass.telegram.miniApp");
  const locale = useLocale();
  const { loading, user } = useAuth();
  const store = localePath(locale, "/store");

  // The script may already be there (a client-side navigation back to /tg).
  useEffect(ready, []);

  useEffect(() => {
    if (!loading && user) {
      window.location.replace(store);
    }
  }, [loading, store, user]);

  return (
    <>
      <Script
        onReady={ready}
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      {loading || user ? (
        <div
          className="flex items-center justify-center gap-2 text-sm"
          role="status"
        >
          <Spinner />
          {t("opening")}
        </div>
      ) : (
        <div className="grid gap-4 text-center">
          <p className="text-muted-foreground text-sm">{t("welcome")}</p>
          <SocialButtons
            providers={providers.filter((item) => item === "telegram")}
            returnTo={store}
          />
          <Button asChild variant="outline">
            <Link href={`/sign-in?return_to=${encodeURIComponent(store)}`}>
              {t("email")}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a href={store}>{t("browse")}</a>
          </Button>
        </div>
      )}
    </>
  );
};
