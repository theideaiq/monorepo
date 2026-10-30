import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { refreshMusicTastes } from "@/lib/music";
import { spotifyApp } from "@/lib/music/config";

/**
 * Daily: updates the artists of Spotify and Last.fm connections older than
 * 7 days, for "Vinyl from artists you listen to".
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const result = await refreshMusicTastes({
      admin: createAdminClient(),
      lastfmKey: env.LASTFM_API_KEY,
      logger: log,
      spotify: spotifyApp() ?? undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error(`Music refresh failed: ${parseError(error)}`);
    return NextResponse.json({ error: "music_failed" }, { status: 500 });
  }
};
