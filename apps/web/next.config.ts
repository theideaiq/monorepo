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

nextConfig.redirects = async () => [
  {
    destination: "/:locale/legal/terms",
    permanent: true,
    source: "/:locale(ar|en)/legal",
  },
  // The template's pricing page became The IDEA Plus; the old site's store URL.
  {
    destination: "/:locale/plus",
    permanent: true,
    source: "/:locale(ar|en)/pricing",
  },
  {
    destination: "/games/spark-catcher/index.html",
    permanent: false,
    source: "/games/spark-catcher",
  },
  {
    destination: "/:locale/store",
    permanent: true,
    source: "/:locale(ar|en)/megastore",
  },
  // The Droid's page became a section of the Club's.
  {
    destination: "/:locale/club#droid",
    permanent: true,
    source: "/:locale(ar|en)/droid",
  },
];

/**
 * Spark Catcher, the Telegram mini-game in public/games, is a static page
 * outside the proxy (which skips .html files). It loads Telegram's Web App
 * script and is shown inside Telegram's clients, so it gets its own policy.
 */
nextConfig.headers = async () => [
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
