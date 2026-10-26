import { type NextRequest, NextResponse } from "next/server";
import {
  callbackUrl,
  finishUrl,
  LOGIN_TTL_SECONDS,
  type LoginState,
  STATE_COOKIE,
  STATE_PURPOSE,
  telegramClient,
} from "@/lib/telegram-login/config";
import { authorizeUrl, randomToken, seal } from "@/lib/telegram-login/oidc";

/**
 * Starts "Continue with Telegram": keeps the state, the PKCE verifier and
 * where to go next in a short-lived cookie, then sends the browser to
 * Telegram. `mode=link` (Your Pass → Settings) always ends in a link ticket. `return_to` is checked by the website when it's used.
 */
export const GET = (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") === "ar" ? "ar" : "en";
  const client = telegramClient();
  if (!client) {
    return NextResponse.redirect(finishUrl(locale, { error: "unavailable" }));
  }

  const returnTo = params.get("return_to");
  const login: LoginState = {
    locale,
    mode: params.get("mode") === "link" ? "link" : "sign-in",
    returnTo: returnTo && returnTo.length <= 2000 ? returnTo : null,
    state: randomToken(),
    verifier: randomToken(),
  };
  const response = NextResponse.redirect(
    authorizeUrl({
      clientId: client.clientId,
      redirectUri: callbackUrl(request),
      state: login.state,
      verifier: login.verifier,
    })
  );
  response.cookies.set(
    STATE_COOKIE,
    seal(client.clientSecret, STATE_PURPOSE, login, LOGIN_TTL_SECONDS),
    {
      httpOnly: true,
      maxAge: LOGIN_TTL_SECONDS,
      path: "/auth/telegram",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    }
  );
  return response;
};
