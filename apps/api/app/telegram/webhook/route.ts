import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getDroid } from "@/lib/telegram";
import { isValidTelegramSecret } from "@/lib/telegram-secret";

// Newsletter posts and AI replies can take a while.
export const maxDuration = 60;

/**
 * Telegram webhook for Droid. Telegram signs nothing, so the request must
 * carry the secret set with `setWebhook` (`bun run telegram:setup`).
 *
 * Errors while handling an update are logged and answered with 200: Telegram
 * would otherwise redeliver the same update again and again.
 */
export const POST = async (request: Request): Promise<Response> => {
  if (
    !isValidTelegramSecret(
      request.headers.get("x-telegram-bot-api-secret-token"),
      env.TELEGRAM_WEBHOOK_SECRET
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const droid = getDroid();
  if (!droid) {
    return new Response("Telegram bot not configured", { status: 503 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (
    !update ||
    typeof update !== "object" ||
    typeof (update as { update_id?: unknown }).update_id !== "number"
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const bot = await droid;
    await bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]);
  } catch (error) {
    log.error(`Telegram update failed: ${parseError(error)}`);
  }
  return NextResponse.json({ ok: true });
};
