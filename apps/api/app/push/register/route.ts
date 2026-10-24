import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/cors";

export const OPTIONS = preflight;

const bodySchema = z.object({
  platform: z.enum(["ios", "android"]),
  token: z.string().min(16).max(4096),
});

/**
 * Registers the caller's device for push notifications (the iOS/Android
 * apps call it after sign-in and on every launch, with the FCM token).
 * Runs as the caller: `register_push_device` stores the token for
 * auth.uid(), moving it from another account if the device changed hands.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return json({ error: "invalid_request" }, 400);
  }

  const { error } = await session.supabase.rpc("register_push_device", {
    device_platform: body.data.platform,
    device_token: body.data.token,
  });
  if (error) {
    log.error(`Push registration failed: ${parseError(error)}`);
    return json({ error: "registration_failed" }, 500);
  }
  return json({ ok: true });
};
