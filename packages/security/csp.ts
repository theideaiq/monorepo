import { defaults, type Options } from "@nosecone/next";

type CspConfig = Exclude<
  NonNullable<Options["contentSecurityPolicy"]>,
  boolean
>;
type Directives = NonNullable<CspConfig["directives"]>;
type Source = Exclude<
  Extract<Directives["connectSrc"], readonly unknown[]>[number],
  () => unknown
>;

type FrameAncestor = Extract<
  Exclude<Directives["frameAncestors"], undefined>,
  readonly unknown[]
>[number];

export interface CspSources {
  connect?: string[];
  font?: string[];
  frame?: string[];
  /** Sites allowed to show these pages in a frame (none by default). */
  frameAncestors?: string[];
  img?: string[];
  media?: string[];
  script?: string[];
  worker?: string[];
}

/**
 * Third-party origins used by the integrations bundled with this template.
 * Remove the ones a project does not use to tighten the policy further.
 */
export const defaultCspSources: CspSources = {
  connect: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://www.facebook.com",
    "https://*.tiktok.com",
    "https://*.posthog.com",
    "https://*.sentry.io",
  ],
  frame: [
    "https://www.googletagmanager.com",
    "https://challenges.cloudflare.com",
  ],
  img: [
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://www.facebook.com",
  ],
  script: [
    "https://www.googletagmanager.com",
    "https://connect.facebook.net",
    "https://analytics.tiktok.com",
    "https://va.vercel-scripts.com",
    "https://challenges.cloudflare.com",
    "https://*.posthog.com",
  ],
};

/**
 * Staff's catalog lookups ("Find picture"): MusicBrainz, Open
 * Library and Wikipedia, queried from the staff member's browser (all three
 * allow CORS). The covers themselves are shown through next/image.
 */
export const catalogLookupCspSources: CspSources = {
  connect: [
    "https://musicbrainz.org",
    "https://openlibrary.org",
    "https://en.wikipedia.org",
  ],
};

/**
 * Telegram Mini Apps: the website opened inside Telegram (the Droid's
 * "Shop" button). Telegram Web shows it in a frame, and the page loads
 * Telegram's Web App script.
 */
export const telegramMiniAppCspSources: CspSources = {
  frameAncestors: ["https://web.telegram.org", "https://*.telegram.org"],
  script: ["https://telegram.org"],
};

/** Our own API (apps/api), called directly from the browser by apps/app. */
export const apiCspSources = (url: string | undefined): CspSources =>
  url ? { connect: [new URL(url).origin] } : {};

/** Supabase REST, Auth, Storage and Realtime (WebSocket) for a project URL. */
export const supabaseCspSources = (url: string | undefined): CspSources => {
  if (!url) {
    return {};
  }

  const { host, origin } = new URL(url);

  return {
    connect: [origin, `wss://${host}`],
    img: [origin],
    media: [origin],
  };
};

const isDevelopment = process.env.NODE_ENV === "development";

const merge = (sources: CspSources[], key: keyof CspSources): Source[] =>
  [...new Set(sources.flatMap((source) => source[key] ?? []))] as Source[];

/** Whether any of these sources lets other sites frame the pages. */
export const allowsFraming = (sources: CspSources[]) =>
  merge(sources, "frameAncestors").length > 0;

/**
 * Builds a Content Security Policy for Nosecone.
 *
 * Default (`strict: false`) is compatible with statically rendered pages:
 * scripts are limited to this origin and the listed hosts, with `'unsafe-inline'` for Next.js' inline bootstrap scripts.
 *
 * `strict: true` switches to nonce + `'strict-dynamic'`, which is stronger but
 * requires every page to be dynamically rendered (Next.js can only attach a
 * per-request nonce to dynamic responses).
 */
export const createContentSecurityPolicy = (
  { strict = false }: { strict?: boolean } = {},
  ...sources: CspSources[]
): CspConfig => {
  const scriptSrc: NonNullable<Directives["scriptSrc"]> = strict
    ? [
        ...(defaults.contentSecurityPolicy.directives.scriptSrc ?? []),
        "'strict-dynamic'",
        ...merge(sources, "script"),
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        ...(isDevelopment ? (["'unsafe-eval'"] as const) : []),
        ...merge(sources, "script"),
      ];

  const frameAncestors = merge(sources, "frameAncestors") as FrameAncestor[];

  return {
    directives: {
      ...defaults.contentSecurityPolicy.directives,
      ...(frameAncestors.length > 0 && {
        frameAncestors: ["'self'", ...frameAncestors],
      }),
      connectSrc: ["'self'", ...merge(sources, "connect")],
      fontSrc: ["'self'", "data:", ...merge(sources, "font")],
      frameSrc: ["'self'", ...merge(sources, "frame")],
      imgSrc: ["'self'", "blob:", "data:", ...merge(sources, "img")],
      mediaSrc: ["'self'", "blob:", ...merge(sources, "media")],
      scriptSrc,
      upgradeInsecureRequests: !isDevelopment,
      workerSrc: ["'self'", "blob:", ...merge(sources, "worker")],
    },
  };
};
