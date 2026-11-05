"use client";

import { useEffect, useState } from "react";
import { TELEGRAM_READY, type TelegramWebApp } from "./telegram";

/**
 * Telegram's Web App object once its script is ready (inside the Droid's
 * Mini App), else null. `TelegramShell` loads the script and says when.
 */
export const useTelegramApp = () => {
  const [app, setApp] = useState<TelegramWebApp | null>(null);
  useEffect(() => {
    const pick = () => setApp(window.Telegram?.WebApp ?? null);
    pick();
    window.addEventListener(TELEGRAM_READY, pick);
    return () => window.removeEventListener(TELEGRAM_READY, pick);
  }, []);
  return app;
};

/**
 * Telegram's main button (the wide one at the bottom of the Mini App):
 * shows `text` while `visible` and runs `onClick`; hidden again when the
 * page goes or `visible` turns false. Does nothing outside Telegram.
 */
export const useTelegramMainButton = ({
  onClick,
  text,
  visible,
}: {
  readonly onClick: () => void;
  readonly text: string;
  readonly visible: boolean;
}) => {
  const app = useTelegramApp();
  useEffect(() => {
    if (!(app && visible)) {
      app?.MainButton.hide();
      return;
    }
    app.MainButton.setText(text);
    app.MainButton.onClick(onClick);
    app.MainButton.show();
    return () => {
      app.MainButton.offClick(onClick);
      app.MainButton.hide();
    };
  }, [app, onClick, text, visible]);
};
