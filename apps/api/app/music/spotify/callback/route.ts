import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { spotifyArtists, spotifyExchange } from "@/lib/music";
import { spotifyApp, spotifyRedirectUri } from "@/lib/music/config";
import { openState } from "@/lib/music/state";

/**
 * Spotify sends the member here after they sign in: their artists are
 * saved with the refresh token, and they go back to the website with
 * `?music=connected` (or `?music=failed`).
 */
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const back = (path: string, outcome: "connected" | "failed") => {
    const target = new URL(path, env.NEXT_PUBLIC_WEB_URL);
    target.searchParams.set("music", outcome);
    return NextResponse.redirect(target, 303);
  };

  const spotify = spotifyApp();
  const state = spotify
    ? await openState(spotify, url.searchParams.get("state") ?? "")
    : null;
  if (!(spotify && state)) {
    return back("/pass/saved", "failed");
  }
  const code = url.searchParams.get("code");
  if (!code) {
    // The member chose Cancel on Spotify.
    return back(state.returnTo, "failed");
  }

  try {
    const tokens = await spotifyExchange(
      spotify,
      code,
      spotifyRedirectUri(request)
    );
    const { account, artists } = await spotifyArtists(tokens.accessToken);
    const { error } = await createAdminClient().rpc("save_music_taste", {
      account,
      artists,
      member: state.userId,
      provider: "spotify",
      refresh_token: tokens.refreshToken ?? undefined,
    });
    if (error) {
      throw new Error(error.message);
    }
    return back(state.returnTo, "connected");
  } catch (error) {
    log.error(`Spotify connection failed: ${parseError(error)}`);
    return back(state.returnTo, "failed");
  }
};
