import { config, withAnalyzer } from "@repo/next-config";
import { withLogging, withSentry } from "@repo/observability/next-config";
import type { NextConfig } from "next";
import { env } from "@/env";
import { docsRewrites } from "@/lib/docs";

let nextConfig: NextConfig = withLogging(config);

// The developer docs at "/" (after every route of this app).
const docs = docsRewrites(env.DOCS_URL);
if (docs.length > 0) {
  const { rewrites } = nextConfig;
  nextConfig.rewrites = async () => {
    const base = (await rewrites?.()) ?? [];
    return Array.isArray(base)
      ? { afterFiles: base, beforeFiles: [], fallback: docs }
      : { ...base, fallback: [...(base.fallback ?? []), ...docs] };
  };
}

if (env.VERCEL) {
  nextConfig = withSentry(nextConfig);
}

if (env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
