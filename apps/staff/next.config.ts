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
 * Staff (staff.theideaiq.com): the tools The IDEA's team uses, at the root,
 * and the design site at /design (the Storybook build in public/design).
 * Security headers come from `proxy.ts`.
 */
let nextConfig: NextConfig = {
  ...withLogging(config),
  async headers() {
    // Staff only: never indexed.
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
};

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default withNextIntl(nextConfig);
