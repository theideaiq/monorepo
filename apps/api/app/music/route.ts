import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  isLastfmUsername,
  lastfmArtists,
  MusicError,
  spotifyAuthorizeUrl,
} from "@/lib/music";
import { spotifyApp, spotifyRedirectUri } from "@/lib/music/config";
import { safeReturnTo, sealState } from "@/lib/music/state";

export const OPTIONS = preflight;

const bodySchema = z.union([
  z.object({ check: z.literal(true) }),
  z.object({
    account: z.string().trim().min(2).max(15),
    provider: z.literal("lastfm"),
  }),
  z.object({
    provider: z.literal("spotify"),
    returnTo: z.string().max(300).optional(),
  }),
]);

/**
 * "Vinyl from artists you listen to". `{ check: true }` says which services
 * are set up; Last.fm is connected at once by username; Spotify returns the
 * link to sign in there (the callback saves the artists).
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
  const spotify = spotifyApp();

  if ("check" in body.data) {
    return json({
      lastfm: Boolean(env.LASTFM_API_KEY),
      spotify: Boolean(spotify),
    });
  }

  if (body.data.provider === "spotify") {
    if (!spotify) {
      return json({ error: "not_configured" }, 503);
    }
    const state = await sealState(spotify, {
      returnTo: safeReturnTo(body.data.returnTo),
      userId: session.userId,
    });
    return json({
      url: spotifyAuthorizeUrl(spotify, spotifyRedirectUri(request), state),
    });
  }

  if (!env.LASTFM_API_KEY) {
    return json({ error: "not_configured" }, 503);
  }
  const { account } = body.data;
  if (!isLastfmUsername(account)) {
    return json({ error: "not_found" }, 404);
  }
  try {
    const artists = await lastfmArtists(account, env.LASTFM_API_KEY);
    const { error } = await createAdminClient().rpc("save_music_taste", {
      account,
      artists,
      member: session.userId,
      provider: "lastfm",
    });
    if (error) {
      throw new Error(error.message);
    }
    return json({ artists: artists.length });
  } catch (error) {
    if (error instanceof MusicError && error.code === "not_found") {
      return json({ error: "not_found" }, 404);
    }
    log.error(`Last.fm connection failed: ${parseError(error)}`);
    return json({ error: "unavailable" }, 502);
  }
};
