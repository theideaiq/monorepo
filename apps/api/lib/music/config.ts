import { env } from "@/env";
import type { SpotifyApp } from "./index";

/** The Spotify app, once its keys are set. */
export const spotifyApp = (): SpotifyApp | null =>
  env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET
    ? {
        clientId: env.SPOTIFY_CLIENT_ID,
        clientSecret: env.SPOTIFY_CLIENT_SECRET,
      }
    : null;

/** Where Spotify sends the member back (registered in Spotify's dashboard). */
export const spotifyRedirectUri = (request: Request) =>
  new URL("/music/spotify/callback", request.url).toString();
