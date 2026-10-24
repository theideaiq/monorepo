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
/** Signs in by password (the app itself only offers phone codes). */
export const customer = {
  email: "e2e-customer@theidea.test",
  name: "E2E Customer",
};
/** Holds a staff role; the journey links an authenticator app first. */
export const staff = { email: "e2e-staff@theidea.test", name: "E2E Staff" };
/**
 * Signs up through the phone form, with the e2e test number from
 * packages/database/supabase/config.toml ([auth.sms.test_otp]). A stack
 * started before that number was added needs `supabase stop && supabase
 * start`, or E2E_PHONE set to another test number (e.g. 9647700000000).
 */
const phone = process.env.E2E_PHONE ?? "9647700000902";
export const phoneUser = {
  code: "123456",
  /** As typed: the local format (07…). */
  local: `0${phone.slice(3)}`,
  name: "E2E Phone",
  phone,
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
