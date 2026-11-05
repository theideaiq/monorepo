"use client";

import { usePathname, useRouter } from "@repo/internationalization/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";
import {
  inTelegramMiniApp,
  showsBackButton,
  TELEGRAM_READY,
  type TelegramWebApp,
} from "@/lib/telegram";

/** `color` (any CSS color) as #rrggbb, the form Telegram takes. */
const toHex = (color: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  return `#${[red, green, blue]
    .map((part) => (part ?? 0).toString(16).padStart(2, "0"))
    .join("")}`;
};

/** Telegram's header and background take the page's own background. */
const matchColors = (app: TelegramWebApp) => {
  const hex = toHex(getComputedStyle(document.body).backgroundColor);
  if (hex) {
    app.setHeaderColor?.(hex);
    app.setBackgroundColor?.(hex);
  }
};

/**
 * The website as the Droid's Mini App (no-op elsewhere): Telegram's header
 * takes the site's colors, light or dark, and Telegram's own back button
 * goes back a page everywhere but the store's front pages.
 */
export const TelegramShell = () => {
  const [inside, setInside] = useState(false);
  const [app, setApp] = useState<TelegramWebApp | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setInside(!isNativeApp() && inTelegramMiniApp());
  }, []);

  useEffect(() => {
    if (!app) {
      return;
    }
    matchColors(app);
    const observer = new MutationObserver(() => matchColors(app));
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, [app]);

  useEffect(() => {
    if (!app) {
      return;
    }
    if (!showsBackButton(pathname)) {
      app.BackButton.hide();
      return;
    }
    const back = () => router.back();
    app.BackButton.onClick(back);
    app.BackButton.show();
    return () => app.BackButton.offClick(back);
  }, [app, pathname, router]);

  if (!inside) {
    return null;
  }
  return (
    <Script
      onReady={() => {
        const webApp = window.Telegram?.WebApp;
        if (webApp) {
          webApp.ready();
          webApp.expand();
          setApp(webApp);
          window.dispatchEvent(new Event(TELEGRAM_READY));
        }
      }}
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
    />
  );
};
