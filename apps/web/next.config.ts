import type { NextConfig } from 'next';
import { webEnv } from '@repo/env/web';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/utils', '@repo/config'],
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
  turbo: {
    resolveAlias: {
      // Ensure shared packages resolve correctly in Turbo
      '@repo/ui': '../../packages/ui/src',
      '@repo/utils': '../../packages/utils/src',
      '@repo/config': '../../packages/config/src',
    },
  },
  async headers() {
    const headers = [
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
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
        value: 'origin-when-cross-origin',
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      let supabaseDomain = '';
      try {
        const url = new URL(webEnv.NEXT_PUBLIC_SUPABASE_URL);
        supabaseDomain = url.hostname;
      } catch (e) {
        // biome-ignore lint/suspicious/noConsole: Critical build-time error logging
        console.error('Failed to parse NEXT_PUBLIC_SUPABASE_URL for CSP', e);
      }

      headers.push({
        key: 'Content-Security-Policy',
        value: `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.youtube.com https://*.ytimg.com;
          style-src 'self' 'unsafe-inline';
          img-src 'self' blob: data: https://*.unsplash.com https://*.ytimg.com https://i.ytimg.com ${supabaseDomain ? `https://${supabaseDomain}` : ''};
          font-src 'self';
          connect-src 'self' ${supabaseDomain ? `https://${supabaseDomain}` : ''} wss://${supabaseDomain ? supabaseDomain : ''} https://*.youtube.com;
          frame-src 'self' https://*.youtube.com https://youtube.com;
          media-src 'self';
        `
          .replace(/\s{2,}/g, ' ')
          .trim(),
      });
    }

    return [
      {
        source: '/:path*',
        headers,
      },
    ];
  },
};

export default nextConfig;
