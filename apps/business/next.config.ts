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

/**
 * The IDEA Spark: the back office (`/admin`) and The IDEA Suite for
 * businesses (`/business`). Customers use the website. Security headers
 * come from `proxy.ts`.
 */
const WEB_URL = (env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  ""
);

let nextConfig: NextConfig = {
  ...withLogging(config),
  async headers() {
    // The back office and the business pages: never indexed.
    return [
      {
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
        source: "/:path*",
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
  // The customer pages and The IDEA Pass moved to the website; links from
  // before (notifications, emails, payment returns) go there.
  async redirects() {
    const prefixed = `/:locale(${locales.join("|")})`;
    const sections =
      ":section(orders|plus|sell|settings|submissions|support|wishlist)";
    return [
      ...[
        "auth/callback",
        "cart",
        "checkout",
        "events",
        "mfa",
        "onboarding",
        "pass",
        "sign-in",
        "sign-out",
        "sign-up",
        "store/:path*",
        // The website sends these on to /pass/… (and old ?id= links too).
        `${sections}/:path*`,
      ].flatMap((path) => [
        {
          destination: `${WEB_URL}/${path}`,
          permanent: false,
          source: `/${path}`,
        },
        {
          destination: `${WEB_URL}/:locale/${path}`,
          permanent: false,
          source: `${prefixed}/${path}`,
        },
      ]),
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
