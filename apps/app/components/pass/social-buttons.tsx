"use client";

import { useAuth } from "@repo/auth/provider";
import {
  rememberReturnTo,
  type SocialProvider,
  startSocialSignIn,
} from "@repo/auth/social";
import { project } from "@repo/config";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { isNativeApp } from "@/lib/platform";

/** The providers' own names (brands, not translated). */
const NAMES: Record<SocialProvider, string> = {
  apple: "Apple",
  google: "Google",
  telegram: "Telegram",
};

/** Where the provider sends people back: the callback page, or the app. */
export const socialRedirect = (locale: string) =>
  isNativeApp()
    ? `${project.bundleId}://auth/callback`
    : new URL(
        localePath(locale, "/auth/callback"),
        window.location.origin
      ).toString();

/** Opens the provider in the system browser (the apps only). */
export const openInSystemBrowser = async (url: string) => {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
};

/**
 * "Continue with Google" and the other providers that are turned on. An
 * address that already has a Pass signs in to it.
 */
export const SocialButtons = ({
  providers,
  returnTo,
}: {
  readonly providers: SocialProvider[];
  readonly returnTo: string | null;
}) => {
  const t = useTranslations("auth.social");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [failed, setFailed] = useState(false);

  if (providers.length === 0) {
    return null;
  }

  const start = async (provider: SocialProvider) => {
    setPending(provider);
    setFailed(false);
    rememberReturnTo(returnTo);
    const native = isNativeApp();
    const result = await startSocialSignIn(supabase, provider, {
      openExternal: native ? openInSystemBrowser : undefined,
      redirectTo: socialRedirect(locale),
    });
    // On the web the page leaves for the provider; in the apps it stays.
    if (!result.ok || native) {
      setPending(null);
    }
    setFailed(!result.ok);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      {providers.map((provider) => (
        <Button
          disabled={pending !== null}
          key={provider}
          onClick={() => start(provider)}
          type="button"
          variant="outline"
        >
          {t("continueWith", { provider: NAMES[provider] })}
        </Button>
      ))}
      {failed ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
