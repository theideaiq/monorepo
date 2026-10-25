"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { localePath } from "@repo/internationalization";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

/** The parts of Telegram's Web App object the Mini App uses. */
interface TelegramWebApp {
  expand: () => void;
  initData: string;
  initDataUnsafe: { user?: { language_code?: string } };
  ready: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type Outcome =
  | { name: string | null; ticket: string }
  | { error: string }
  | { tokenHash: string };

type View =
  | { kind: "opening" }
  | { kind: "suspended" }
  | { kind: "welcome"; name: string | null; ticket: string };

/** Arabic for members whose Telegram is in Arabic, else this page's language. */
const languageOf = (webApp: TelegramWebApp, fallback: string) =>
  webApp.initDataUnsafe.user?.language_code?.startsWith("ar") ? "ar" : fallback;

const finishUrl = (locale: string, params: Record<string, string | null>) => {
  const search = new URLSearchParams({
    return_to: localePath(locale, "/store"),
  });
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  return `${localePath(locale, "/sign-in/telegram")}?${search}`;
};

const signIn = async (apiUrl: string, initData: string): Promise<Outcome> => {
  const response = await fetch(`${apiUrl}/auth/telegram/web-app`, {
    body: JSON.stringify({ initData }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await response.json()) as Outcome;
};

/**
 * The Droid's Mini App: Telegram opens /tg with signed initData. A linked
 * Telegram account signs straight in; a new one is linked to the member
 * who is signed in, or offered the choice to connect The IDEA Pass or
 * browse as a guest. Then on to the store.
 */
export const TelegramMiniApp = ({
  apiUrl,
}: {
  /** apps/api (NEXT_PUBLIC_API_URL), or null while it isn't set. */
  readonly apiUrl: string | null;
}) => {
  const t = useTranslations("pass.telegram.miniApp");
  const pageLocale = useLocale();
  const { loading, user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [locale, setLocale] = useState<string>(pageLocale);
  const [view, setView] = useState<View>({ kind: "opening" });

  const start = useCallback(() => {
    const webApp = window.Telegram?.WebApp;
    if (!(webApp?.initData && apiUrl)) {
      // Opened outside Telegram (or the API isn't set up): just the store.
      window.location.replace(localePath(pageLocale, "/store"));
      return;
    }
    webApp.ready();
    webApp.expand();
    setLocale(languageOf(webApp, pageLocale));
    signIn(apiUrl, webApp.initData)
      .then(setOutcome)
      .catch(() => setOutcome({ error: "failed" }));
  }, [apiUrl, pageLocale]);

  // The script may already be there (a client-side navigation back to /tg).
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      start();
    }
  }, [start]);

  useEffect(() => {
    if (!outcome || loading) {
      return;
    }
    if ("tokenHash" in outcome) {
      window.location.replace(
        finishUrl(locale, { token_hash: outcome.tokenHash })
      );
    } else if ("error" in outcome) {
      if (outcome.error === "suspended") {
        setView({ kind: "suspended" });
      } else {
        window.location.replace(localePath(locale, "/store"));
      }
    } else if (user) {
      // Signed in already: the finish page links the account, then on.
      window.location.replace(finishUrl(locale, { ticket: outcome.ticket }));
    } else {
      setView({ kind: "welcome", name: outcome.name, ticket: outcome.ticket });
    }
  }, [loading, locale, outcome, user]);

  return (
    <>
      <Script
        onReady={start}
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      {view.kind === "opening" && (
        <div
          className="flex items-center justify-center gap-2 text-sm"
          role="status"
        >
          <Spinner />
          {t("opening")}
        </div>
      )}
      {view.kind === "suspended" && (
        <p className="text-center text-sm" role="alert">
          {t("suspended")}
        </p>
      )}
      {view.kind === "welcome" && (
        <div className="grid gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            {view.name ? t("welcomeName", { name: view.name }) : t("welcome")}
          </p>
          <Button asChild>
            <a
              href={finishUrl(locale, {
                name: view.name,
                ticket: view.ticket,
              })}
            >
              {t("connect")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={localePath(locale, "/store")}>{t("browse")}</a>
          </Button>
        </div>
      )}
    </>
  );
};
