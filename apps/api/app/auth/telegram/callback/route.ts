import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import {
  callbackUrl,
  finishUrl,
  type LinkTicket,
  LOGIN_TTL_SECONDS,
  type LoginState,
  STATE_COOKIE,
  STATE_PURPOSE,
  TICKET_PURPOSE,
  telegramClient,
} from "@/lib/telegram-login/config";
import { exchangeCode, seal, unseal } from "@/lib/telegram-login/oidc";
import { signInToken } from "@/lib/telegram-login/sign-in";

/**
 * Telegram sends the browser back here. A linked account signs straight in;
 * a new one gets a ticket the website uses to link it once the member has
 * signed in with their email (or is signed in already).
 */
export const GET = async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const client = telegramClient();
  const login = client
    ? unseal<LoginState>(
        client.clientSecret,
        STATE_PURPOSE,
        request.cookies.get(STATE_COOKIE)?.value
      )
    : null;
  const locale = login?.locale ?? "en";
  const finish = (outcome: Record<string, string | null | undefined>) => {
    const response = NextResponse.redirect(
      finishUrl(locale, { ...outcome, return_to: login?.returnTo })
    );
    response.cookies.delete({ name: STATE_COOKIE, path: "/auth/telegram" });
    return response;
  };

  const code = params.get("code");
  if (!(client && login && code) || params.get("state") !== login.state) {
    return finish({ error: params.get("error") ? "cancelled" : "failed" });
  }

  try {
    const identity = await exchangeCode(client, {
      code,
      redirectUri: callbackUrl(request),
      verifier: login.verifier,
    });
    const signIn =
      login.mode === "link" ? null : await signInToken(identity.id);
    if (signIn && "error" in signIn) {
      return finish({ error: signIn.error });
    }
    if (signIn) {
      return finish({ token_hash: signIn.tokenHash });
    }
    const ticket: LinkTicket = {
      firstName: identity.firstName ?? identity.name,
      id: identity.id,
      lastName: identity.lastName,
      username: identity.username,
    };
    return finish({
      name: ticket.firstName,
      ticket: seal(
        client.clientSecret,
        TICKET_PURPOSE,
        ticket,
        LOGIN_TTL_SECONDS
      ),
    });
  } catch (error) {
    log.error(`Telegram sign-in failed: ${parseError(error)}`);
    return finish({ error: "failed" });
  }
};
