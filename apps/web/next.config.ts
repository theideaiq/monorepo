import '@repo/env/web';
import withBundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const isMobile = process.env.NEXT_PUBLIC_APP_ENV === 'mobile';

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/ui', '@repo/utils', '@repo/env'],
  output: isMobile ? 'export' : undefined,
  images: {
    unoptimized: isMobile,
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

    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        supabaseDomain = url.hostname;
      // biome-ignore lint/suspicious/noExplicitAny: Error type
      } catch (e) {
        // biome-ignore lint/suspicious/noConsole: Critical build-time error logging
        console.error('Failed to parse NEXT_PUBLIC_SUPABASE_URL for CSP', e);
      }
    }

    const csp = [
      "default-src 'self'",
      `img-src 'self' data: blob: images.unsplash.com i.ytimg.com ${supabaseDomain}`,
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${supabaseDomain}`,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js in dev, unsafe-inline for scripts
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

export default withAnalyzer(withNextIntl(nextConfig));
