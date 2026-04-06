import '@repo/env/admin';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/ui', '@repo/utils', '@repo/env'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseDomain = '';

    // Safely parse the Supabase URL for CSP
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        supabaseDomain = url.hostname;
      } catch (_e) {
        // biome-ignore lint/suspicious/noConsole: Critical build-time warning
        console.warn(
          '⚠️ Failed to parse NEXT_PUBLIC_SUPABASE_URL for CSP. API calls might be blocked.',
        );
      }
    }

    // specific directives
    const connectSrc = supabaseDomain
      ? `connect-src 'self' ${supabaseDomain}`
      : "connect-src 'self'";

    const imgSrc = supabaseDomain
      ? `img-src 'self' data: blob: images.unsplash.com i.ytimg.com ${supabaseDomain}`
      : "img-src 'self' data: blob: images.unsplash.com i.ytimg.com";

    const csp = [
      "default-src 'self'",
      imgSrc,
      "style-src 'self' 'unsafe-inline'",
      connectSrc,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js in dev
      "font-src 'self' data:",
    ]
      .filter(Boolean)
      .join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default withAnalyzer(nextConfig);
