import type { Database } from "@repo/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Every value set (KEY="" reads as unset). */
const set = (...values: unknown[]) =>
  values.every(
    (value) => value !== undefined && value !== null && value !== ""
  );

/** The environment variables the integrations read, by name. */
export type HealthEnv = Partial<Record<string, string | undefined>>;

/**
 * Which integrations are configured, as booleans: never a value. Each check
 * is the condition the integration's own code uses to switch itself on.
 */
export const integrations = (env: HealthEnv) => ({
  appleWallet: set(
    env.APPLE_WALLET_CERTIFICATE,
    env.APPLE_WALLET_KEY,
    env.APPLE_WALLET_PASS_TYPE_ID,
    env.APPLE_WALLET_TEAM_ID,
    env.APPLE_WALLET_WWDR
  ),
  arcjet: set(env.ARCJET_KEY),
  betterStack: set(env.BETTERSTACK_API_KEY, env.BETTERSTACK_URL),
  boxy: set(env.BOXY_API_KEY, env.BOXY_API_SECRET),
  boxyWebhook: set(env.BOXY_WEBHOOK_SECRET),
  cron: set(env.CRON_SECRET),
  docs: set(env.DOCS_URL),
  googleWallet: set(
    env.GOOGLE_WALLET_ISSUER_ID,
    env.GOOGLE_WALLET_SERVICE_ACCOUNT
  ),
  lastfm: set(env.LASTFM_API_KEY),
  lookupBgg: set(env.BGG_TOKEN),
  lookupDiscogs: set(env.DISCOGS_TOKEN),
  lookupGoogleBooks: set(env.GOOGLE_BOOKS_API_KEY),
  lookupIgdb: set(env.IGDB_CLIENT_ID, env.IGDB_CLIENT_SECRET),
  lookupPokemonTcg: set(env.POKEMONTCG_API_KEY),
  lookupTmdb: set(env.TMDB_READ_TOKEN),
  metaConversions: set(env.META_CONVERSIONS_ACCESS_TOKEN),
  newsletter: set(env.RESEND_TOKEN, env.RESEND_SEGMENT_ID),
  oidc: set(env.PASS_OIDC_SIGNING_KEY),
  push: set(env.FCM_SERVICE_ACCOUNT),
  pushWebhook: set(env.PUSH_WEBHOOK_SECRET),
  reloadly: set(env.RELOADLY_CLIENT_ID, env.RELOADLY_CLIENT_SECRET),
  resend: set(env.RESEND_TOKEN, env.RESEND_FROM),
  sentry: set(env.NEXT_PUBLIC_SENTRY_DSN),
  spotify: set(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
  supabase: set(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY),
  telegram: set(env.TELEGRAM_BOT_TOKEN),
  telegramLogin: set(
    env.TELEGRAM_LOGIN_CLIENT_ID,
    env.TELEGRAM_LOGIN_CLIENT_SECRET
  ),
  telegramWebhook: set(env.TELEGRAM_WEBHOOK_SECRET),
  tiktokEvents: set(env.TIKTOK_EVENTS_ACCESS_TOKEN),
  upstash: set(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN),
  wayl: set(env.WAYL_API_TOKEN, env.WAYL_WEBHOOK_SECRET),
  whatsapp: set(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID),
});

export type Integrations = ReturnType<typeof integrations>;

/**
 * Notification events that are also emailed (`claim_email_notifications`):
 * the reminders. Keep in step with the job that emails them.
 */
export const REMINDER_EMAIL_EVENTS = ["travel_due"] as const;

/** The events with a WhatsApp template (`claim_whatsapp_notifications`). */
export const WHATSAPP_EVENTS = [
  "order_paid",
  "order_shipped",
  "rental_due_soon",
] as const;

const HOUR = 60 * 60 * 1000;

/**
 * The window a notification counts as stuck in: older than an hour (the
 * webhook sends at once; the catch-up runs daily), and still inside the
 * window the channel's claim reads (a day; two for email), since older
 * rows are never sent and aren't a queue any more.
 */
export const stuckWindow = (now: Date, days = 1) => ({
  before: new Date(now.getTime() - HOUR).toISOString(),
  since: new Date(now.getTime() - days * 24 * HOUR).toISOString(),
});

/** How many rows a candidate read takes; a full read reads as "at least". */
export const QUEUE_READ_LIMIT = 1000;

export interface QueueCount {
  /** True when the count hit the read limit: there are at least this many. */
  capped: boolean;
  count: number;
}

/** The candidates whose recipient is eligible for the channel. */
export const countEligible = (
  rows: readonly { user_id: string }[],
  eligible: ReadonlySet<string>
): QueueCount => ({
  capped: rows.length >= QUEUE_READ_LIMIT,
  count: rows.filter((row) => eligible.has(row.user_id)).length,
});

type Admin = SupabaseClient<Database>;
type Window = ReturnType<typeof stuckWindow>;

const IN_CHUNK = 200;

const chunks = <T>(items: T[]) => {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += IN_CHUNK) {
    out.push(items.slice(start, start + IN_CHUNK));
  }
  return out;
};

const fail = (error: { message: string } | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

/** Push claims every notification, so every unpushed one is waiting. */
const pushQueue = async (admin: Admin, window: Window) => {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("pushed_at", null)
    .gt("created_at", window.since)
    .lte("created_at", window.before);
  fail(error);
  return { capped: false, count: count ?? 0 };
};

/** Linked Telegram members among these users. */
const linkedToTelegram = async (admin: Admin, users: string[]) => {
  const linked = new Set<string>();
  for (const part of chunks(users)) {
    // biome-ignore lint/performance/noAwaitInLoops: small sequential reads
    const { data, error } = await admin
      .from("telegram_members")
      .select("user_id")
      .in("user_id", part);
    fail(error);
    for (const row of data ?? []) {
      if (row.user_id) {
        linked.add(row.user_id);
      }
    }
  }
  return linked;
};

/** WhatsApp only goes to customers who opted in with a phone number. */
const optedInToWhatsApp = async (admin: Admin, users: string[]) => {
  const opted = new Set<string>();
  for (const part of chunks(users)) {
    // biome-ignore lint/performance/noAwaitInLoops: small sequential reads
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .in("id", part)
      .eq("whatsapp_opt_in", true)
      .not("whatsapp_phone", "is", null);
    fail(error);
    for (const row of data ?? []) {
      opted.add(row.id);
    }
  }
  return opted;
};

/** Telegram only claims notifications of members who linked Telegram. */
const telegramQueue = async (admin: Admin, window: Window) => {
  const { data, error } = await admin
    .from("notifications")
    .select("user_id")
    .is("telegram_sent_at", null)
    .gt("created_at", window.since)
    .lte("created_at", window.before)
    .limit(QUEUE_READ_LIMIT);
  fail(error);
  const rows = data ?? [];
  const users = [...new Set(rows.map((row) => row.user_id))];
  return countEligible(rows, await linkedToTelegram(admin, users));
};

/** WhatsApp sends only its templated events, to customers who opted in. */
const whatsappQueue = async (admin: Admin, window: Window) => {
  const { data, error } = await admin
    .from("notifications")
    .select("user_id")
    .is("whatsapp_sent_at", null)
    .in("event", [...WHATSAPP_EVENTS])
    .gt("created_at", window.since)
    .lte("created_at", window.before)
    .limit(QUEUE_READ_LIMIT);
  fail(error);
  const rows = data ?? [];
  const users = [...new Set(rows.map((row) => row.user_id))];
  return countEligible(rows, await optedInToWhatsApp(admin, users));
};

/** Reminders not emailed yet (the claim reads the last two days). */
const emailQueue = async (admin: Admin, window: Window) => {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("emailed_at", null)
    .in("event", [...REMINDER_EMAIL_EVENTS])
    .gt("created_at", window.since)
    .lte("created_at", window.before);
  fail(error);
  return { capped: false, count: count ?? 0 };
};

export interface Queues {
  email: QueueCount | null;
  push: QueueCount | null;
  telegram: QueueCount | null;
  whatsapp: QueueCount | null;
}

/**
 * Notifications that should have gone out on a channel and haven't, per
 * channel; null for a channel that isn't configured (nothing sends on it,
 * so nothing is stuck).
 */
export const countQueues = async (
  admin: Admin,
  configured: Pick<Integrations, "push" | "resend" | "telegram" | "whatsapp">,
  now = new Date()
): Promise<Queues> => {
  const day = stuckWindow(now);
  const [push, telegram, whatsapp, email] = await Promise.all([
    configured.push ? pushQueue(admin, day) : null,
    configured.telegram ? telegramQueue(admin, day) : null,
    configured.whatsapp ? whatsappQueue(admin, day) : null,
    configured.resend ? emailQueue(admin, stuckWindow(now, 2)) : null,
  ]);
  return { email, push, telegram, whatsapp };
};
