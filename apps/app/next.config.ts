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

nextConfig.headers = async () => [
  // The IDEA Pass and Your Pass: never indexed.
  ...[
    "mfa",
    "pass/:path*",
    "saved",
    "sign-in",
    "sign-out",
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
];

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
