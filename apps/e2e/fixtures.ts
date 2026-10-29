import { createHmac } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const publishable =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

/** Service-role client: seeds users and data, bypassing RLS. */
export const admin = () => {
  if (!secret) {
    throw new Error(
      "Set SUPABASE_SECRET_KEY (bunx supabase status -o env, in packages/database)."
    );
  }
  return createClient(SUPABASE_URL, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const PASSWORD = "E2e-pass-12345";
/**
 * Most journeys sign in by password through the API (fast); the app itself
 * only offers email codes, which the sign-in journey uses for this account.
 */
export const customer = {
  email: "e2e-customer@theidea.test",
  name: "E2E Customer",
};
/** Receives the customer's gift. */
export const friend = { email: "e2e-friend@theidea.test", name: "E2E Friend" };
/** Holds a staff role; the journey links an authenticator app first. */
export const staff = { email: "e2e-staff@theidea.test", name: "E2E Staff" };
/** Gets The IDEA Pass through the email form (deleted and re-created each run). */
export const signUpUser = {
  email: "e2e-signup@theidea.test",
  name: "E2E Sign-up",
};

/**
 * The local stack's mail catcher (Mailpit; `MAILPIT_URL` from `supabase
 * status -o env`, which the e2e job passes). Supabase Auth sends every
 * email there.
 */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const EMAIL_CODE = /\b(\d{8})\b/;

const inbox = (email: string) =>
  `${MAILPIT_URL}/api/v1/search?${new URLSearchParams({ query: `to:"${email}"` })}`;

/** Deletes every email to `email`, so the next one is the code just sent. */
export const clearInbox = async (email: string) => {
  const response = await fetch(inbox(email), { method: "DELETE" });
  if (!response.ok) {
    throw new Error(
      `Mailpit answered ${response.status}; is it running (MAILPIT_URL=${MAILPIT_URL})?`
    );
  }
};

/**
 * The 6-digit code in the newest email to `email` (call `clearInbox`
 * before sending), polling Mailpit until it arrives.
 */
export const emailedCode = async (email: string) => {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await fetch(inbox(email));
    const { messages = [] } = (await response.json()) as {
      messages?: { ID: string }[];
    };
    const [latest] = messages;
    if (latest) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)
      ).json()) as { Text: string };
      const code = EMAIL_CODE.exec(message.Text)?.[1];
      if (code) {
        return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No code emailed to ${email} (Mailpit: ${MAILPIT_URL}).`);
};
/** An in-stock product of its own, so journeys never touch seeded stock. */
export const product = {
  name: "E2E Desk Lamp",
  nameAr: "مصباح مكتب للاختبار",
  slug: "e2e-desk-lamp",
};

/**
 * Signs in by password the way the browser client would and returns the
 * Supabase session cookies (written by @supabase/ssr, so their name and
 * encoding match what the apps read).
 */
export const sessionCookies = async (email: string, origin: string) => {
  const jar = new Map<string, string>();
  const client = createServerClient(SUPABASE_URL, publishable, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) {
          if (value) {
            jar.set(name, value);
          } else {
            jar.delete(name);
          }
        }
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    throw error;
  }
  const { hostname } = new URL(origin);
  return [...jar].map(([name, value]) => ({
    domain: hostname,
    name,
    path: "/",
    sameSite: "Lax" as const,
    value,
  }));
};

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** The current 6-digit code for a base32 TOTP secret (RFC 6238, SHA-1, 30 s). */
export const totp = (base32: string, at = Date.now()) => {
  let bits = "";
  for (const char of base32.replace(/[=]+$/, "").toUpperCase()) {
    bits += BASE32.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2))
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const hmac = createHmac("sha1", bytes).update(counter).digest();
  // Dynamic truncation: the low 4 bits pick the offset, the top bit is dropped.
  const offset = (hmac.at(-1) ?? 0) % 16;
  const value = (hmac.readUInt32BE(offset) % 2 ** 31) % 1_000_000;
  return String(value).padStart(6, "0");
};
