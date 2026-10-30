import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Product lookups (brief section 25). Open Library, Google Books,
 * MusicBrainz, the Cover Art Archive and Scryfall need no key; the others
 * are skipped while theirs is unset. See ARCHITECTURE_AND_INTEGRATIONS.md,
 * "Product lookups".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      BGG_TOKEN: process.env.BGG_TOKEN,
      DISCOGS_TOKEN: process.env.DISCOGS_TOKEN,
      GOOGLE_BOOKS_API_KEY: process.env.GOOGLE_BOOKS_API_KEY,
      IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID,
      IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET,
      POKEMONTCG_API_KEY: process.env.POKEMONTCG_API_KEY,
      TMDB_READ_TOKEN: process.env.TMDB_READ_TOKEN,
    },
    server: {
      // boardgamegeek.com → Applications: a registered app's bearer token.
      BGG_TOKEN: z.string().min(8).optional(),
      // discogs.com → Settings → Developers → Generate new token.
      DISCOGS_TOKEN: z.string().min(8).optional(),
      // Google Cloud → APIs → Books API key (optional; raises the quota).
      GOOGLE_BOOKS_API_KEY: z.string().min(8).optional(),
      // dev.twitch.tv → Applications (IGDB uses Twitch's client credentials).
      IGDB_CLIENT_ID: z.string().min(8).optional(),
      IGDB_CLIENT_SECRET: z.string().min(8).optional(),
      // dev.pokemontcg.io (optional; raises the rate limit).
      POKEMONTCG_API_KEY: z.string().min(8).optional(),
      // themoviedb.org → Settings → API → "API Read Access Token".
      TMDB_READ_TOKEN: z.string().min(20).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });
