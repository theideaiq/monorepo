import { ALLOWED_UPDATES, DROID_COMMANDS } from "@repo/droid";

/**
 * Setting up Droid, The IDEA's Telegram bot, and reading back how it's set
 * up: the webhook (this API), its commands in Arabic and English, the menu
 * button that opens the website as a Mini App (/tg) and its descriptions.
 * Used by Staff (Telegram → Bot) and `bun run telegram:setup`.
 */

type Call = <T = unknown>(
  method: string,
  body?: Record<string, unknown>
) => Promise<T>;

/** A Telegram Bot API caller for `token`; throws Telegram's description. */
export const telegramApi =
  (token: string, fetchImpl: typeof fetch = fetch): Call =>
  async <T>(method: string, body: Record<string, unknown> = {}) => {
    const response = await fetchImpl(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        body: JSON.stringify(body),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      }
    );
    const payload = (await response.json().catch(() => ({}))) as {
      description?: string;
      ok?: boolean;
      result?: T;
    };
    if (!payload.ok) {
      throw new Error(
        `${method}: ${payload.description ?? `HTTP ${response.status}`}`
      );
    }
    return payload.result as T;
  };

/** What people read before starting the bot (≤ 512) and in its profile (≤ 120). */
export const BOT_TEXTS = {
  ar: {
    description:
      "أنا الدرويد من ايديا في بغداد: أتابع طلباتك وتأجيرات ايديا پلص، وأذكّرك بالمواعيد وأخبرك بالفعاليات. اربط ايديا پاس من الزر أدناه لتصلك التحديثات هنا.",
    short: "الدرويد من ايديا: طلباتك وايديا پلص والفعاليات في Telegram.",
  },
  en: {
    description:
      "I'm Droid from The IDEA in Baghdad: I follow your orders and The IDEA Plus rentals, remind you of due dates and tell you about events. Link The IDEA Pass with the button below to get updates here.",
    short:
      "Droid from The IDEA: your orders, The IDEA Plus and events on Telegram.",
  },
} as const;

export interface SetupTargets {
  /** This API's public URL (the webhook goes to /telegram/webhook). */
  apiUrl: string;
  /** The webhook's secret token. */
  secret: string;
  /** The website's URL (the Mini App opens /tg). */
  webUrl: string;
}

/** Points the webhook here and publishes the commands, menu and texts. */
export const setUpBot = async (call: Call, targets: SetupTargets) => {
  const done: string[] = [];
  const webhook = new URL("/telegram/webhook", targets.apiUrl).toString();
  await call("setWebhook", {
    allowed_updates: ALLOWED_UPDATES,
    drop_pending_updates: false,
    secret_token: targets.secret,
    url: webhook,
  });
  done.push("webhook");

  for (const [locale, commands] of Object.entries(DROID_COMMANDS)) {
    // Arabic is the default list; English for English Telegram apps.
    const language = locale === "ar" ? {} : { language_code: locale };
    // biome-ignore lint/performance/noAwaitInLoops: a handful of calls, in order
    await call("setMyCommands", {
      commands: commands.private,
      scope: { type: "all_private_chats" },
      ...language,
    });
    await call("setMyCommands", {
      commands: commands.admins,
      scope: { type: "all_chat_administrators" },
      ...language,
    });
  }
  done.push("commands");

  await call("setChatMenuButton", {
    menu_button: {
      text: "The IDEA",
      type: "web_app",
      web_app: { url: new URL("/tg", targets.webUrl).toString() },
    },
  });
  done.push("menu");

  for (const [locale, texts] of Object.entries(BOT_TEXTS)) {
    const language = locale === "ar" ? {} : { language_code: locale };
    // biome-ignore lint/performance/noAwaitInLoops: a handful of calls, in order
    await call("setMyDescription", {
      description: texts.description,
      ...language,
    });
    await call("setMyShortDescription", {
      short_description: texts.short,
      ...language,
    });
  }
  done.push("texts");
  return { done, webhook };
};

interface WebhookInfo {
  last_error_date?: number;
  last_error_message?: string;
  pending_update_count: number;
  url: string;
}

export interface BotStatus {
  commands: number;
  description: boolean;
  lastError: { at: string; message: string } | null;
  menu: string | null;
  pending: number;
  username: string;
  webhook: { matches: boolean; url: string | null };
}

/** How the bot is set up now, against where it should point. */
export const botStatus = async (
  call: Call,
  targets: Pick<SetupTargets, "apiUrl">
): Promise<BotStatus> => {
  const expected = new URL("/telegram/webhook", targets.apiUrl).toString();
  const [me, hook, commands, menu, description] = await Promise.all([
    call<{ username: string }>("getMe"),
    call<WebhookInfo>("getWebhookInfo"),
    call<unknown[]>("getMyCommands", {
      scope: { type: "all_private_chats" },
    }),
    call<{ type: string; web_app?: { url: string } }>("getChatMenuButton"),
    call<{ description: string }>("getMyDescription"),
  ]);
  return {
    commands: commands.length,
    description: Boolean(description.description),
    lastError: hook.last_error_message
      ? {
          at: new Date((hook.last_error_date ?? 0) * 1000).toISOString(),
          message: hook.last_error_message,
        }
      : null,
    menu: menu.type === "web_app" ? (menu.web_app?.url ?? null) : null,
    pending: hook.pending_update_count,
    username: me.username,
    webhook: { matches: hook.url === expected, url: hook.url || null },
  };
};
