import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { hasBearerSecret } from "@/lib/push/secret";
import { getDroid } from "@/lib/telegram";
import { deliverTelegramPosts } from "@/lib/telegram-posts";

// Supabase Database Webhook payload (INSERT on public.telegram_posts).
const payloadSchema = z.object({
  table: z.literal("telegram_posts"),
  type: z.literal("INSERT"),
});

/**
 * Posts what was just queued (news, an event, new arrivals) to the Club's
 * topics. Called by a Supabase Database Webhook on inserts into
 * `telegram_posts`, with `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`;
 * the queue itself is read (and claimed) from the database.
 */
export const POST = async (request: Request): Promise<Response> => {
  if (!hasBearerSecret(request, env.PUSH_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const payload = payloadSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!payload.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const droid = getDroid();
  if (!droid) {
    return NextResponse.json({ ok: true, skipped: "telegram_not_configured" });
  }
  try {
    const summary = await deliverTelegramPosts(
      createAdminClient(),
      await droid
    );
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    log.error(`Telegram topic posts failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};
