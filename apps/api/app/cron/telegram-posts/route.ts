import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { getDroid } from "@/lib/telegram";
import { deliverTelegramPosts } from "@/lib/telegram-posts";

/**
 * Daily catch-up for the Club's topics: queues scheduled posts of The IDEA
 * Post whose time has come, then sends whatever the webhook missed.
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  const droid = getDroid();
  if (!droid) {
    return NextResponse.json({ ok: true, skipped: "telegram_not_configured" });
  }
  const admin = createAdminClient();
  try {
    const { data: queued, error } = await admin.rpc("queue_due_telegram_posts");
    if (error) {
      throw new Error(error.message);
    }
    const summary = await deliverTelegramPosts(admin, await droid);
    return NextResponse.json({ ok: true, queued, ...summary });
  } catch (error) {
    log.error(`Telegram topic catch-up failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};
