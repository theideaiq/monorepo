import { authenticateRequest } from "@repo/auth/verify";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/cors";

export const OPTIONS = preflight;

const bodySchema = z.object({ token: z.string().min(16).max(4096) });

/**
 * Removes the caller's device (sign-out), as the caller: RLS only lets
 * people delete their own devices.
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

  const { error } = await session.supabase
    .from("push_devices")
    .delete()
    .eq("token", body.data.token);
  return error ? json({ error: "unregister_failed" }, 500) : json({ ok: true });
};
