import { createAdminClient } from "@repo/database/admin";
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
import {
  exchangeCode,
  seal,
  type TelegramIdentity,
  unseal,
} from "@/lib/telegram-login/oidc";

/**
 * The member a linked Telegram account belongs to, as a one-time sign-in
 * token for the website (`verifyOtp` with the token hash), or why not.
 */
const signInToken = async (identity: TelegramIdentity) => {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("telegram_members")
    .select("user_id")
    .eq("id", identity.id)
    .maybeSingle();
  if (!member?.user_id) {
    return null;
  }
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(member.user_id),
    admin
      .from("profiles")
      .select("banned_at")
      .eq("id", member.user_id)
      .maybeSingle(),
  ]);
  const email = user.user?.email;
  if (profile?.banned_at) {
    return { error: "suspended" } as const;
  }
  if (!email) {
    return null;
  }
  const { data, error } = await admin.auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  if (error || !data.properties?.hashed_token) {
    throw error ?? new Error("No sign-in token");
  }
  return { tokenHash: data.properties.hashed_token } as const;
};

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
    const signIn = login.mode === "link" ? null : await signInToken(identity);
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
