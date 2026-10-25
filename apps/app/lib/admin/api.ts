import "server-only";

import { log } from "@repo/observability/log";
import { env } from "@/env";
import type { ServerClient } from "./session";

export type ApiResult<T> =
  | { data: T; ok: true }
  | { error: string; ok: false; status: number };

/**
 * Calls an apps/api endpoint as the signed-in staff member (Bearer access
 * token). apps/api verifies the token and the staff role itself before it
 * uses any privileged client.
 */
export const callApi = async <T>(
  supabase: ServerClient,
  path: string,
  body: unknown
): Promise<ApiResult<T>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!(session && env.NEXT_PUBLIC_API_URL)) {
    return { error: "unavailable", ok: false, status: 0 };
  }

  try {
    const response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & T;

    if (!response.ok) {
      // A firewall in front of apps/api (Cloudflare's bot challenge sends
      // `cf-mitigated`) answers with an HTML page, not our JSON error: the
      // request never reached the API, so report it as unreachable rather
      // than as the API's own 403.
      if (!payload.error || response.headers.has("cf-mitigated")) {
        log.warn(
          `apps/api ${path} answered ${response.status} without reaching the API (${response.headers.get("cf-mitigated") ?? "no JSON error"})`
        );
        return { error: "unavailable", ok: false, status: 0 };
      }
      return {
        error: payload.error ?? "request_failed",
        ok: false,
        status: response.status,
      };
    }
    return { data: payload, ok: true };
  } catch {
    return { error: "unavailable", ok: false, status: 0 };
  }
};
