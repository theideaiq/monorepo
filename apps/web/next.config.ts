import { locales } from "@repo/internationalization";
import {
  catalogImagePatterns,
  config,
  isLocalUrl,
  withAnalyzer,
} from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

let nextConfig: NextConfig = withLogging(config);

// Product images, covers and journal PDFs come from Supabase Storage; the
// initial catalog also links to cover-art sources (catalogImagePatterns).
nextConfig.images = {
  ...nextConfig.images,
  // Only the local development stack runs on a private address.
  dangerouslyAllowLocalIP: isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL),
  remotePatterns: [
    ...(nextConfig.images?.remotePatterns ?? []),
    ...catalogImagePatterns(env.NEXT_PUBLIC_SUPABASE_URL),
  ],
};

// Pages that moved into My Pass (/pass/…): links stored before the move
// (notifications, emails, payment returns, Telegram) keep working. /plus
// stays the public page; its management page is /pass/plus.
const passSections = "orders|sell|settings|submissions|support|wishlist";

type Redirect = Awaited<
  ReturnType<NonNullable<NextConfig["redirects"]>>
>[number];

/**
 * A redirect for a page in every language: English pages have no prefix
 * (`/x`), the others do (`/ar/x`; older `/en/x` links too).
 */
const everyLanguage = ({
  destination,
  source,
  ...rest
}: Redirect): Redirect[] => [
  { ...rest, destination, source },
  {
    ...rest,
    destination: `/:locale${destination}`,
    source: `/:locale(${locales.join("|")})${source}`,
  },
];

nextConfig.redirects = async () => [
  // Detail pages took a query parameter while the app was a static export.
  ...everyLanguage({
    destination: "/pass/orders/:id",
    has: [{ key: "id", type: "query", value: "(?<id>[^&]+)" }],
    permanent: true,
    source: "/orders/view",
  }),
  ...everyLanguage({
    destination: "/pass/support/:id",
    has: [{ key: "id", type: "query", value: "(?<id>[^&]+)" }],
    permanent: true,
    source: "/support/view",
  }),
  ...everyLanguage({
    destination: "/store/:slug",
    has: [{ key: "slug", type: "query", value: "(?<slug>[^&]+)" }],
    permanent: true,
    source: "/store/product",
  }),
  ...everyLanguage({
    destination: "/pass/:section/:path*",
    permanent: true,
    source: `/:section(${passSections})/:path*`,
  }),
  ...everyLanguage({
    destination: "/legal/terms",
    permanent: true,
    source: "/legal",
  }),
  // The template's pricing page became The IDEA Plus; the old site's store URL.
  ...everyLanguage({
    destination: "/plus",
    permanent: true,
    source: "/pricing",
  }),
  {
    destination: "/games/spark-catcher/index.html",
    permanent: false,
    source: "/games/spark-catcher",
  },
  ...everyLanguage({
    destination: "/store",
    permanent: true,
    source: "/megastore",
  }),
  // The company pages live under /about.
  ...everyLanguage({
    destination: "/about/:page",
    permanent: true,
    source: "/:page(careers|contact|faq)",
  }),
  // The Droid's page became a section of the Club's.
  ...everyLanguage({
    destination: "/club#droid",
    permanent: true,
    source: "/droid",
  }),
];

/**
 * Spark Catcher, the Telegram mini-game in public/games, is a static page
 * outside the proxy (which skips .html files). It loads Telegram's Web App
 * script and is shown inside Telegram's clients, so it gets its own policy.
 */
nextConfig.headers = async () => [
  // The IDEA Pass and My Pass: never indexed.
  ...[
    "mfa",
    "pass/:path*",
    "sign-in",
    "sign-out",
    "sign-up",
    "tg",
    "cart",
    "checkout",
    "onboarding",
  ].flatMap((path) =>
    [`/${path}`, `/:locale(${locales.join("|")})/${path}`].map((source) => ({
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      source,
    }))
  ),
  // Universal Links: Apple reads this file (no extension) as JSON.
  {
    headers: [{ key: "Content-Type", value: "application/json" }],
    source: "/.well-known/apple-app-site-association",
  },
  {
    headers: [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' https://telegram.org",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "base-uri 'none'",
          "form-action 'none'",
          "object-src 'none'",
          "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
        ].join("; "),
      },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ],
    source: "/games/:path*",
  },
];

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
