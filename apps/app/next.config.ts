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

/**
 * The IDEA Spark: one server-rendered Next.js app for the web and for the
 * iOS/Android apps, whose WebView loads the live site (Capacitor
 * `server.url`). Security headers come from `proxy.ts`.
 */
let nextConfig: NextConfig = {
  ...withLogging(config),
  async headers() {
    // The back office and The IDEA Pass: never indexed.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      ...["admin/:path*", "mfa", "pass", "sign-in", "sign-out", "sign-up"].map(
        (path) => ({ headers: noindex, source: `/:locale(ar|en)/${path}` })
      ),
      // Universal Links: Apple reads this file (no extension) as JSON.
      {
        headers: [{ key: "Content-Type", value: "application/json" }],
        source: "/.well-known/apple-app-site-association",
      },
    ];
  },
  // Catalog images (Supabase Storage and the cover-art sources), optimized
  // on the server so the browser only loads from this origin.
  images: {
    ...config.images,
    dangerouslyAllowLocalIP: isLocalUrl(env.NEXT_PUBLIC_SUPABASE_URL),
    remotePatterns: catalogImagePatterns(env.NEXT_PUBLIC_SUPABASE_URL),
  },
  // Detail pages used query parameters while the app was a static export;
  // old links (the website, payment returns, notifications) keep working.
  async redirects() {
    const locale = ":locale(ar|en)";
    return [
      {
        destination: "/:locale/store/:slug",
        has: [{ key: "slug", type: "query", value: "(?<slug>[^&]+)" }],
        permanent: true,
        source: `/${locale}/store/product`,
      },
      {
        destination: "/:locale/orders/:id",
        has: [{ key: "id", type: "query", value: "(?<id>[^&]+)" }],
        permanent: true,
        source: `/${locale}/orders/view`,
      },
      {
        destination: "/:locale/support/:id",
        has: [{ key: "id", type: "query", value: "(?<id>[^&]+)" }],
        permanent: true,
        source: `/${locale}/support/view`,
      },
    ];
  },
};

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
