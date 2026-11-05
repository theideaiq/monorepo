"use client";

import { useAuth } from "@repo/auth/provider";
import type { SocialProvider } from "@repo/auth/social";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SocialButtons } from "@/components/pass/social-buttons";
import { callPublicApi } from "@/lib/api";
import { markTelegramMiniApp } from "@/lib/telegram";

const ready = () => {
  markTelegramMiniApp();
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
};

/**
 * One-tap sign-in (A26): the API checks Telegram's signed `initData` and, for
 * a Telegram account linked to a Pass, returns a one-time token the browser
 * exchanges for a session. False when that isn't possible.
 */
const signInWithInitData = async (
  supabase: ReturnType<typeof useAuth>["supabase"],
  initData: string
) => {
  try {
    const { tokenHash } = await callPublicApi<{ tokenHash: string }>(
      "/v1/telegram/mini-app",
      { initData }
    );
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    return !error;
  } catch {
    return false;
  }
};

/**
 * The Droid's Mini App: Telegram opens the website at /tg. A signed-in
 * Pass goes straight to the store; a Telegram account linked to a Pass
 * signs straight in; otherwise "Continue with Telegram"
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
  const { loading, supabase, user } = useAuth();
  const store = localePath(locale, "/store");
  const [scriptReady, setScriptReady] = useState(false);
  const [trying, setTrying] = useState(true);

  // The script may already be there (a client-side navigation back to /tg).
  useEffect(() => {
    ready();
    if (window.Telegram?.WebApp) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (loading || user || !scriptReady) {
      return;
    }
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setTrying(false);
      return;
    }
    let active = true;
    signInWithInitData(supabase, initData).then((signedIn) => {
      // Signed in, the effect below takes the member to the store.
      if (active && !signedIn) {
        setTrying(false);
      }
    });
    return () => {
      active = false;
    };
  }, [loading, scriptReady, supabase, user]);

  useEffect(() => {
    if (!loading && user) {
      window.location.replace(store);
    }
  }, [loading, store, user]);

  return (
    <>
      <Script
        // Blocked or offline: show the buttons rather than wait.
        onError={() => setScriptReady(true)}
        onReady={() => {
          ready();
          setScriptReady(true);
        }}
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      {loading || user || trying ? (
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
