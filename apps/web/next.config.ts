import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "@/env";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

let nextConfig: NextConfig = withLogging(config);

// Product images, covers and journal PDFs come from Supabase Storage.
const supabase = env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const isLocalSupabase =
  supabase !== null &&
  ["127.0.0.1", "localhost", "[::1]"].includes(supabase.hostname);

nextConfig.images = {
  ...nextConfig.images,
  // Only the local development stack runs on a private address.
  dangerouslyAllowLocalIP: isLocalSupabase,
  remotePatterns: [
    ...(nextConfig.images?.remotePatterns ?? []),
    ...(supabase
      ? [
          {
            hostname: supabase.hostname,
            pathname: "/storage/v1/object/public/**",
            port: supabase.port,
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
          },
        ]
      : []),
  ],
};

// biome-ignore lint/suspicious/useAwait: redirects is async
nextConfig.redirects = async () => [
  {
    destination: "/:locale/legal/terms",
    permanent: true,
    source: "/:locale(ar|en)/legal",
  },
  // The template's pricing page became IDEA Plus; the old site's store URL.
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
];

/**
 * Spark Catcher, the Telegram mini-game in public/games, is a static page
 * outside the proxy (which skips .html files). It loads Telegram's Web App
 * script and is shown inside Telegram's clients, so it gets its own policy.
 */
// biome-ignore lint/suspicious/useAwait: headers is async
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
