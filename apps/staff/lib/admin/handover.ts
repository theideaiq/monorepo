/**
 * Staff → Settings → Handover: the outside services the code integrates
 * with, one row each, and the runbooks to read. Names and uses are in
 * `admin.handover.services.<id>`; `integrations` are the ids of apps/api's
 * `POST /admin/health` answer that must all be true for the service to
 * count as configured (empty: set outside apps/api, so not checked here).
 * Only services the code actually uses belong here: no accounts, plans or
 * prices.
 */
export interface Service {
  dashboard: string;
  /** Environment variable (or repository secret) names, never values. */
  env: readonly string[];
  id: string;
  integrations: readonly string[];
}

export const services = [
  {
    dashboard: "https://supabase.com/dashboard",
    env: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
    ],
    id: "supabase",
    integrations: ["supabase"],
  },
  {
    dashboard: "https://vercel.com/dashboard",
    env: ["CRON_SECRET"],
    id: "vercel",
    integrations: ["cron"],
  },
  {
    dashboard: "https://github.com/theideaiq/monorepo",
    env: [
      "CRON_SECRET",
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_DB_PASSWORD",
      "BACKUP_PASSPHRASE",
      "BACKUP_HEARTBEAT_URL",
      "TURBO_TOKEN",
    ],
    id: "github",
    integrations: [],
  },
  {
    dashboard: "https://dash.cloudflare.com",
    env: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
    id: "cloudflare",
    integrations: [],
  },
  {
    dashboard: "https://resend.com/emails",
    env: ["RESEND_TOKEN", "RESEND_FROM", "RESEND_SEGMENT_ID"],
    id: "resend",
    integrations: ["resend"],
  },
  {
    dashboard: "https://wayl.io",
    env: [
      "WAYL_API_TOKEN",
      "WAYL_WEBHOOK_SECRET",
      "WAYL_ENV",
      "WAYL_API_URL",
      "PAYMENTS_PROVIDER",
    ],
    id: "wayl",
    integrations: ["wayl"],
  },
  {
    dashboard: "https://tryboxy.com",
    env: [
      "BOXY_API_KEY",
      "BOXY_API_SECRET",
      "BOXY_API_URL",
      "BOXY_PICKUP_LOCATION",
      "BOXY_WEBHOOK_HEADER",
      "BOXY_WEBHOOK_SECRET",
    ],
    id: "boxy",
    integrations: ["boxy", "boxyWebhook"],
  },
  {
    dashboard: "https://www.reloadly.com",
    env: [
      "RELOADLY_CLIENT_ID",
      "RELOADLY_CLIENT_SECRET",
      "RELOADLY_ENVIRONMENT",
    ],
    id: "reloadly",
    integrations: ["reloadly"],
  },
  {
    dashboard: "https://t.me/BotFather",
    env: [
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "TELEGRAM_LOGIN_CLIENT_ID",
      "TELEGRAM_LOGIN_CLIENT_SECRET",
    ],
    id: "telegram",
    integrations: ["telegram", "telegramWebhook"],
  },
  {
    dashboard: "https://console.firebase.google.com",
    env: ["FCM_SERVICE_ACCOUNT", "PUSH_WEBHOOK_SECRET"],
    id: "firebase",
    integrations: ["push", "pushWebhook"],
  },
  {
    dashboard: "https://business.facebook.com",
    env: [
      "WHATSAPP_ACCESS_TOKEN",
      "WHATSAPP_PHONE_NUMBER_ID",
      "WHATSAPP_TEMPLATE_LANG",
    ],
    id: "whatsapp",
    integrations: ["whatsapp"],
  },
  {
    // Twilio Verify is Supabase Auth's phone provider: its keys are set in
    // the Supabase dashboard, not in an app.
    dashboard: "https://console.twilio.com",
    env: [],
    id: "twilio",
    integrations: [],
  },
  {
    dashboard: "https://developer.apple.com/account",
    env: [
      "APPLE_WALLET_CERTIFICATE",
      "APPLE_WALLET_KEY",
      "APPLE_WALLET_PASS_TYPE_ID",
      "APPLE_WALLET_TEAM_ID",
      "APPLE_WALLET_WWDR",
    ],
    id: "appleWallet",
    integrations: ["appleWallet"],
  },
  {
    dashboard: "https://pay.google.com/business/console",
    env: ["GOOGLE_WALLET_ISSUER_ID", "GOOGLE_WALLET_SERVICE_ACCOUNT"],
    id: "googleWallet",
    integrations: ["googleWallet"],
  },
  {
    dashboard: "https://uptime.betterstack.com",
    env: ["BETTERSTACK_API_KEY", "BETTERSTACK_URL"],
    id: "betterStack",
    integrations: ["betterStack"],
  },
  {
    dashboard: "https://sentry.io",
    env: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT"],
    id: "sentry",
    integrations: ["sentry"],
  },
  {
    dashboard: "https://console.upstash.com",
    env: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    id: "upstash",
    integrations: ["upstash"],
  },
  {
    dashboard: "https://app.arcjet.com",
    env: ["ARCJET_KEY"],
    id: "arcjet",
    integrations: ["arcjet"],
  },
  {
    dashboard: "https://analytics.google.com",
    env: ["NEXT_PUBLIC_GA_MEASUREMENT_ID"],
    id: "googleAnalytics",
    integrations: [],
  },
  {
    dashboard: "https://app.posthog.com",
    env: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"],
    id: "posthog",
    integrations: [],
  },
  {
    dashboard: "https://business.facebook.com/events_manager",
    env: [
      "NEXT_PUBLIC_META_PIXEL_ID",
      "META_CONVERSIONS_ACCESS_TOKEN",
      "META_TEST_EVENT_CODE",
    ],
    id: "meta",
    integrations: ["metaConversions"],
  },
  {
    dashboard: "https://ads.tiktok.com",
    env: [
      "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
      "TIKTOK_EVENTS_ACCESS_TOKEN",
      "TIKTOK_TEST_EVENT_CODE",
    ],
    id: "tiktok",
    integrations: ["tiktokEvents"],
  },
  {
    dashboard: "https://developer.spotify.com/dashboard",
    env: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
    id: "spotify",
    integrations: ["spotify"],
  },
  {
    dashboard: "https://www.last.fm/api/accounts",
    env: ["LASTFM_API_KEY"],
    id: "lastfm",
    integrations: ["lastfm"],
  },
  {
    dashboard: "https://www.themoviedb.org/settings/api",
    env: ["TMDB_READ_TOKEN"],
    id: "tmdb",
    integrations: ["lookupTmdb"],
  },
  {
    dashboard: "https://dev.twitch.tv/console/apps",
    env: ["IGDB_CLIENT_ID", "IGDB_CLIENT_SECRET"],
    id: "igdb",
    integrations: ["lookupIgdb"],
  },
  {
    dashboard: "https://www.discogs.com/settings/developers",
    env: ["DISCOGS_TOKEN"],
    id: "discogs",
    integrations: ["lookupDiscogs"],
  },
  {
    dashboard: "https://boardgamegeek.com/applications",
    env: ["BGG_TOKEN"],
    id: "bgg",
    integrations: ["lookupBgg"],
  },
  {
    dashboard: "https://console.cloud.google.com/apis",
    env: ["GOOGLE_BOOKS_API_KEY"],
    id: "googleBooks",
    integrations: ["lookupGoogleBooks"],
  },
  {
    dashboard: "https://dev.pokemontcg.io",
    env: ["POKEMONTCG_API_KEY"],
    id: "pokemonTcg",
    integrations: ["lookupPokemonTcg"],
  },
  {
    dashboard: "https://dashboard.mintlify.com",
    env: ["DOCS_URL"],
    id: "mintlify",
    integrations: ["docs"],
  },
] as const satisfies readonly Service[];

export type ServiceId = (typeof services)[number]["id"];

export type Configured = "missing" | "set" | "unchecked" | "unknown";

/**
 * Whether a service is configured: "unchecked" when apps/api can't see its
 * settings (they live in another app or dashboard), "unknown" when the
 * health answer is missing, otherwise "set" only when every one of its
 * integrations is.
 */
export const serviceConfigured = (
  service: Pick<Service, "integrations">,
  integrations: Readonly<Record<string, boolean>> | null
): Configured => {
  if (service.integrations.length === 0) {
    return "unchecked";
  }
  if (!integrations) {
    return "unknown";
  }
  return service.integrations.every((id) => integrations[id] === true)
    ? "set"
    : "missing";
};

/** The runbooks and decisions, as repository paths. */
export const runbooks = [
  { id: "platform", path: "docs/platform/README.md" },
  { id: "releases", path: "docs/platform/releases.md" },
  { id: "backups", path: "docs/platform/backups.md" },
  { id: "incidents", path: "docs/platform/incidents.md" },
  { id: "passSignIn", path: "docs/platform/pass-sign-in.md" },
  { id: "progress", path: "PROGRESS.md" },
  { id: "architecture", path: "ARCHITECTURE_AND_INTEGRATIONS.md" },
] as const;

const TRAILING_SLASHES = /\/+$/;

/** A file of the repository on GitHub, on main. */
export const githubFile = (repoUrl: string, path: string) =>
  `${repoUrl.replace(TRAILING_SLASHES, "")}/blob/main/${path}`;
