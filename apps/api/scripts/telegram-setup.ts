#!/usr/bin/env bun
/**
 * Points Droid's Telegram webhook at this API, publishes its commands,
 * sets the menu button that opens the website as a Mini App (/tg) and the
 * bot's descriptions. Staff does the same (Telegram → Bot).
 *
 *   bun run --cwd apps/api telegram:setup
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_API_URL
 * (Bun loads apps/api/.env*). Pass a URL to override the webhook base:
 *
 *   bun run --cwd apps/api telegram:setup https://api.theideaiq.com
 */
import { setUpBot, telegramApi } from "../lib/telegram-setup";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2] ?? process.env.NEXT_PUBLIC_API_URL;
const site = process.env.NEXT_PUBLIC_WEB_URL ?? "https://theideaiq.com";

if (!(token && secret && base)) {
  console.error(
    "Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_API_URL (or pass the API URL)."
  );
  process.exit(1);
}

const { done, webhook } = await setUpBot(telegramApi(token), {
  apiUrl: base,
  secret,
  webUrl: site,
});
for (const step of done) {
  console.log(`✓ ${step}`);
}
console.log(`Webhook set to ${webhook}`);
