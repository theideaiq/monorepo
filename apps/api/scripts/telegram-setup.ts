#!/usr/bin/env bun
/**
 * Points Droid's Telegram webhook at this API, publishes its commands and
 * sets the menu button that opens the website as a Mini App (/tg).
 *
 *   bun run --cwd apps/api telegram:setup
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_API_URL
 * (Bun loads apps/api/.env*). Pass a URL to override the webhook base:
 *
 *   bun run --cwd apps/api telegram:setup https://api.theideaiq.com
 */
import { ALLOWED_UPDATES, DROID_COMMANDS } from "@repo/droid";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2] ?? process.env.NEXT_PUBLIC_API_URL;

if (!(token && secret && base)) {
  console.error(
    "Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_API_URL (or pass the API URL)."
  );
  process.exit(1);
}

const call = async (method: string, body: Record<string, unknown>) => {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  const result = (await response.json()) as {
    description?: string;
    ok: boolean;
  };
  if (!result.ok) {
    throw new Error(
      `${method} failed: ${result.description ?? response.status}`
    );
  }
  console.log(`✓ ${method}`);
  return result;
};

const url = new URL("/telegram/webhook", base).toString();

await call("setWebhook", {
  allowed_updates: ALLOWED_UPDATES,
  drop_pending_updates: false,
  secret_token: secret,
  url,
});

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

// The menu button beside the message box opens the website as a Mini App.
const site = process.env.NEXT_PUBLIC_WEB_URL;
if (site) {
  await call("setChatMenuButton", {
    menu_button: {
      text: "The IDEA",
      type: "web_app",
      web_app: { url: new URL("/tg", site).toString() },
    },
  });
} else {
  console.warn("Set NEXT_PUBLIC_WEB_URL to add the Mini App menu button.");
}

console.log(`Webhook set to ${url}`);
