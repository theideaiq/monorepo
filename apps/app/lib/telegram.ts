/**
 * The website inside Telegram, as the Droid's Mini App. Telegram adds
 * `tgWebAppData` to the address's hash when it opens the Mini App; the tab
 * remembers it so later pages (a full reload from /tg to the store, say)
 * still know they are inside Telegram.
 */
const FLAG = "the-idea-telegram-mini-app";

/** The parts of Telegram's Web App object the website uses. */
export interface TelegramWebApp {
  BackButton: {
    hide: () => void;
    offClick: (callback: () => void) => void;
    onClick: (callback: () => void) => void;
    show: () => void;
  };
  expand: () => void;
  /** The signed launch data (empty outside a real Mini App launch). */
  initData?: string;
  MainButton: {
    hide: () => void;
    offClick: (callback: () => void) => void;
    onClick: (callback: () => void) => void;
    setText: (text: string) => void;
    show: () => void;
  };
  ready: () => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
}

/** Sent on `window` once Telegram's script is ready (`TelegramShell`). */
export const TELEGRAM_READY = "the-idea:telegram-ready";

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** True once Telegram opened this tab as the Mini App. */
export const inTelegramMiniApp = () => {
  try {
    if (window.location.hash.includes("tgWebAppData")) {
      window.sessionStorage.setItem(FLAG, "1");
      return true;
    }
    return window.sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};

/** Remembers, for this tab, that it is the Mini App (the /tg page). */
export const markTelegramMiniApp = () => {
  try {
    window.sessionStorage.setItem(FLAG, "1");
  } catch {
    // Storage blocked: only /tg itself knows.
  }
};

const ROOTS = new Set(["/", "/store", "/tg"]);
const TRAILING_SLASHES = /\/+$/;

/**
 * Whether Telegram's back button shows on `pathname` (without the language
 * prefix): everywhere but the store's front pages and /tg, where back would
 * close the Mini App.
 */
export const showsBackButton = (pathname: string) =>
  !ROOTS.has(pathname.replace(TRAILING_SLASHES, "") || "/");
