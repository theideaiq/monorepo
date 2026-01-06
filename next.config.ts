import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // --- ADD THIS BLOCK ---
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // <--- YouTube Thumbnails live here
      },
      // ----------------------
    ],
  },
};

export default withNextIntl(nextConfig);
