import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import type { SpotifyApp } from "./index";

/** How long the member has to sign in to Spotify. */
const STATE_TTL = "10m";

const stateSchema = z.object({
  returnTo: z.string().startsWith("/").max(300),
  userId: z.uuid(),
});

export type SpotifyState = z.infer<typeof stateSchema>;

// The state's key, derived from the app's secret so there's no other secret.
const stateKey = (app: SpotifyApp) =>
  createHash("sha256").update(`spotify-state:${app.clientSecret}`).digest();

/** Where the website may send the member back to: a path on it. */
export const safeReturnTo = (value: string | undefined) =>
  value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value.slice(0, 300)
    : "/pass/saved";

export const sealState = (app: SpotifyApp, state: SpotifyState) =>
  new EncryptJWT({ ...state })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .encrypt(stateKey(app));

export const openState = (app: SpotifyApp, sealed: string) =>
  jwtDecrypt(sealed, stateKey(app))
    .then(({ payload }) => stateSchema.parse(payload))
    .catch(() => null);
