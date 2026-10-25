import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { webCorsHeaders, webPreflight } from "@/lib/cors";
import {
  type LinkTicket,
  LOGIN_TTL_SECONDS,
  TICKET_PURPOSE,
  ticketSecret,
} from "@/lib/telegram-login/config";
import { seal } from "@/lib/telegram-login/oidc";
import { signInToken } from "@/lib/telegram-login/sign-in";
import { verifyInitData } from "@/lib/telegram-login/web-app";

export const OPTIONS = webPreflight;

const bodySchema = z.object({ initData: z.string().min(10).max(8000) });

/**
 * The Mini App (the website opened from the Droid's menu) sends Telegram's
 * signed initData here. A linked account gets a one-time sign-in token; a
 * new one gets a ticket to link it once the member signs in.
 */
export const POST = async (request: Request) => {
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers: webCorsHeaders(request), status });

  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = ticketSecret();
  if (!(token && secret)) {
    return json({ error: "not_configured" }, 503);
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  const user = body.success ? verifyInitData(body.data.initData, token) : null;
  if (!user) {
    return json({ error: "invalid_init_data" }, 401);
  }

  try {
    const signIn = await signInToken(user.id);
    if (signIn && "error" in signIn) {
      return json({ error: signIn.error }, 403);
    }
    if (signIn) {
      return json({ tokenHash: signIn.tokenHash });
    }
    const ticket: LinkTicket = {
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      username: user.username,
    };
    return json({
      name: user.firstName,
      ticket: seal(secret, TICKET_PURPOSE, ticket, LOGIN_TTL_SECONDS),
    });
  } catch (error) {
    log.error(`Telegram Mini App sign-in failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};
