import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { botStatus, setUpBot, telegramApi } from "@/lib/telegram-setup";
import { requireStaffCaller } from "../_lib/staff";

const body = z.object({ action: z.enum(["status", "setup"]) });

/**
 * Back office → Telegram → Bot: how Droid is set up (webhook, pending
 * updates, last error, commands, Mini App button, sign-in with Telegram)
 * and, for admins, setting it up again in one go. The bot token never
 * leaves the API.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, [
    "superadmin",
    "admin",
    "marketing",
    "support",
  ]);
  if (caller instanceof NextResponse) {
    return caller;
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const configured = {
    bot: Boolean(env.TELEGRAM_BOT_TOKEN),
    login: Boolean(
      env.TELEGRAM_LOGIN_CLIENT_ID && env.TELEGRAM_LOGIN_CLIENT_SECRET
    ),
    webhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
  };
  if (!env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ configured, status: null });
  }
  const call = telegramApi(env.TELEGRAM_BOT_TOKEN);
  const apiUrl = env.NEXT_PUBLIC_API_URL ?? "https://api.theideaiq.com";
  try {
    if (parsed.data.action === "setup") {
      if (!["superadmin", "admin"].includes(caller.role)) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (!env.TELEGRAM_WEBHOOK_SECRET) {
        return NextResponse.json(
          { error: "webhook_secret_missing" },
          { status: 409 }
        );
      }
      await setUpBot(call, {
        apiUrl,
        secret: env.TELEGRAM_WEBHOOK_SECRET,
        webUrl: env.NEXT_PUBLIC_WEB_URL,
      });
    }
    return NextResponse.json({
      configured,
      status: await botStatus(call, { apiUrl }),
    });
  } catch (error) {
    log.error(`Telegram ${parsed.data.action} failed: ${parseError(error)}`);
    return NextResponse.json(
      { error: "telegram_failed", message: parseError(error) },
      { status: 502 }
    );
  }
};
