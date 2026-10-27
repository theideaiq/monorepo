import {
  defaults,
  nosecone,
  type Options,
  withVercelToolbar,
} from "@nosecone/next";
import {
  allowsFraming,
  apiCspSources,
  type CspSources,
  createContentSecurityPolicy,
  defaultCspSources,
  supabaseCspSources,
} from "./csp";

// Nosecone security headers configuration
// https://docs.arcjet.com/nosecone/quick-start
const buildOptions = (extraSources: CspSources[] = []): Options => {
  const options: Options = {
    ...defaults,
    contentSecurityPolicy: createContentSecurityPolicy(
      {},
      defaultCspSources,
      supabaseCspSources(process.env.NEXT_PUBLIC_SUPABASE_URL),
      apiCspSources(process.env.NEXT_PUBLIC_API_URL),
      ...extraSources
    ),
    // `require-corp` blocks third-party images, pixels and iframes that do not
    // send a Cross-Origin-Resource-Policy header (most analytics endpoints).
    crossOriginEmbedderPolicy: false,
    // Pages other sites may frame say so with CSP frame-ancestors, which
    // X-Frame-Options (same origin only) would contradict.
    ...(allowsFraming(extraSources) && {
      xFrameOptions: false,
    }),
    // Keeps the origin on cross-site requests so analytics attribution works,
    // without leaking full URLs (paths, query strings) to third parties.
    referrerPolicy: { policy: ["strict-origin-when-cross-origin"] },
    // Two years, every subdomain, and eligible for the browsers' preload list
    // (submit theideaiq.com once at hstspreload.org, after every subdomain
    // serves HTTPS).
    strictTransportSecurity: {
      includeSubDomains: true,
      maxAge: 63_072_000,
      preload: true,
    },
  };
  // The Vercel Toolbar's origins are allowed on preview deployments only,
  // where Vercel shows it.
  return process.env.VERCEL_ENV === "preview"
    ? withVercelToolbar(options)
    : options;
};

/** Security headers for every app. */
export const noseconeOptions: Options = buildOptions();

/**
 * The same headers with more origins allowed, for the pages that need them
 * (Staff: `catalogLookupCspSources`).
 */
export const noseconeOptionsWith = (...sources: CspSources[]): Options =>
  buildOptions(sources);

/**
 * Adds Nosecone's security headers to an existing proxy response (for example
 * one that carries refreshed auth cookies or an i18n rewrite) instead of
 * replacing it.
 */
export const withSecurityHeaders = <T extends Response>(
  response: T,
  options: Options = noseconeOptions
): T => {
  for (const [name, value] of nosecone(options)) {
    response.headers.set(name, value);
  }

  return response;
};
