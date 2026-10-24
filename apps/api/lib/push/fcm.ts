import { createSign } from "node:crypto";
import { z } from "zod";

/**
 * Firebase Cloud Messaging (HTTP v1) for both platforms: Android directly,
 * iOS through the APNs key uploaded to the Firebase project. The app
 * registers an FCM token on both (see ARCHITECTURE_AND_INTEGRATIONS.md,
 * "Push notifications").
 *
 * Authenticates with a service account (FCM_SERVICE_ACCOUNT, the JSON key
 * file's contents): a signed JWT is exchanged for an OAuth access token,
 * cached until shortly before it expires. No Google SDK needed.
 */

const serviceAccountSchema = z.object({
  client_email: z.email(),
  private_key: z.string().min(1),
  project_id: z.string().min(1),
  token_uri: z.url().default("https://oauth2.googleapis.com/token"),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

/** Parses FCM_SERVICE_ACCOUNT (raw JSON or base64 of it); null if unusable. */
export const parseServiceAccount = (
  value: string | undefined
): ServiceAccount | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  const json = trimmed.startsWith("{")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8");
  try {
    const parsed = serviceAccountSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export interface PushMessage {
  body: string;
  /** String values only (FCM's `data` map); the app reads `link`. */
  data: Record<string, string>;
  title: string;
  token: string;
}

/** `invalid_token`: the device is gone; remove it. */
export type PushResult = "sent" | "invalid_token" | "failed";

export interface PushSender {
  send: (message: PushMessage) => Promise<PushResult>;
}

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_LIFETIME_S = 3600;
const REFRESH_MARGIN_MS = 60_000;

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64url");

/** The RS256 JWT a service account trades for an access token. */
export const signAssertion = (account: ServiceAccount, nowS: number) => {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      aud: account.token_uri,
      exp: nowS + TOKEN_LIFETIME_S,
      iat: nowS,
      iss: account.client_email,
      scope: SCOPE,
    })
  );
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(account.private_key);
  return `${header}.${claims}.${base64url(signature)}`;
};

interface FcmError {
  error?: {
    details?: { errorCode?: string }[];
  };
}

// UNREGISTERED (404): the app was removed or the token rotated. Other
// errors (quota, a bad payload, FCM down) keep the device.
const isInvalidToken = (status: number, body: FcmError) =>
  status === 404 ||
  (body.error?.details ?? []).some(
    (detail) => detail.errorCode === "UNREGISTERED"
  );

export const createFcmSender = (
  account: ServiceAccount,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): PushSender => {
  let cached: { expiresAt: number; token: string } | null = null;

  const accessToken = async () => {
    if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now()) {
      return cached.token;
    }
    const response = await fetchImpl(account.token_uri, {
      body: new URLSearchParams({
        assertion: signAssertion(account, Math.floor(now() / 1000)),
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      }),
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`FCM auth failed (${response.status})`);
    }
    const json = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    cached = {
      expiresAt: now() + (json.expires_in ?? TOKEN_LIFETIME_S) * 1000,
      token: json.access_token,
    };
    return cached.token;
  };

  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`;

  return {
    send: async ({ body, data, title, token }) => {
      const response = await fetchImpl(endpoint, {
        body: JSON.stringify({
          message: {
            apns: { payload: { aps: { sound: "default" } } },
            data,
            notification: { body, title },
            token,
          },
        }),
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (response.ok) {
        return "sent";
      }
      const json = (await response.json().catch(() => ({}))) as FcmError;
      return isInvalidToken(response.status, json) ? "invalid_token" : "failed";
    },
  };
};
