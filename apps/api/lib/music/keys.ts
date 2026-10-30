import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * "Vinyl from artists you listen to": Spotify (sign-in) and Last.fm (a
 * username). Each is offered once its keys are set. See
 * ARCHITECTURE_AND_INTEGRATIONS.md, "Vinyl from artists you listen to".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      LASTFM_API_KEY: process.env.LASTFM_API_KEY,
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    },
    server: {
      // last.fm/api/account/create → "API key".
      LASTFM_API_KEY: z.string().min(16).optional(),
      // developer.spotify.com → Dashboard → an app with the Web API, and
      // the redirect URI https://<api host>/music/spotify/callback.
      SPOTIFY_CLIENT_ID: z.string().min(16).optional(),
      SPOTIFY_CLIENT_SECRET: z.string().min(16).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
