import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The IDEA IQ',
    short_name: 'IDEA',
    description:
      'The digital headquarters for innovators, artists, and thinkers in Iraq.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#E91E63', // Brand Pink
    icons: [
      {
        src: '/icon.svg', // Ensure you have this file in public/ or src/app/
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png', // Optional: standard png fallback
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png', // Optional: standard png fallback
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
