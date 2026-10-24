import type { NextConfig } from "next";

// Storybook builds into public/ (bun run build); "/" is its index.html.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  rewrites: async () => ({
    afterFiles: [],
    beforeFiles: [{ destination: "/index.html", source: "/" }],
    fallback: [],
  }),
};

export default nextConfig;
