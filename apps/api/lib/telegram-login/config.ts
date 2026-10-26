import { localePath } from "@repo/internationalization";
import { env } from "@/env";
import type { TelegramClient } from "./oidc";

/** The sign-in cookie (state, PKCE verifier, where to go next). */
export const STATE_COOKIE = "idea_telegram_login";
export const STATE_PURPOSE = "telegram-login-state";
/** The ticket that lets a signed-in member link a verified account. */
export const TICKET_PURPOSE = "telegram-link-ticket";
/** Ten minutes for both. */
export const LOGIN_TTL_SECONDS = 600;

export interface LoginState {
  locale: "ar" | "en";
  /** Connecting from Your Pass: always link, never switch members. */
  mode: "link" | "sign-in";
  returnTo: string | null;
  state: string;
  verifier: string;
}

export interface LinkTicket {
  firstName: string | null;
  id: number;
  lastName: string | null;
  username: string | null;
}

/** The bot's OpenID Connect client, or null while it isn't set up. */
export const telegramClient = (): TelegramClient | null =>
  env.TELEGRAM_LOGIN_CLIENT_ID && env.TELEGRAM_LOGIN_CLIENT_SECRET
    ? {
        clientId: env.TELEGRAM_LOGIN_CLIENT_ID,
        clientSecret: env.TELEGRAM_LOGIN_CLIENT_SECRET,
      }
    : null;

/**
 * The key for link tickets: the sign-in client's secret, or the bot's token
 * when only the Mini App is set up (its tickets come from initData).
 */
export const ticketSecret = () =>
  env.TELEGRAM_LOGIN_CLIENT_SECRET ?? env.TELEGRAM_BOT_TOKEN ?? null;

/** Telegram returns here (an Allowed URL in @BotFather). */
export const callbackUrl = (request: Request) =>
  new URL("/auth/telegram/callback", request.url).toString();

/**
 * The website's page that finishes Telegram sign-in, with the outcome:
 * a sign-in token, a link ticket or an error.
 */
export const finishUrl = (
  locale: string,
  params: Record<string, string | null | undefined>
) => {
  const url = new URL(
    localePath(locale, "/sign-in/telegram"),
    env.NEXT_PUBLIC_WEB_URL
  );
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
};
