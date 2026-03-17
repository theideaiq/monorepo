import { webEnv as env } from '@repo/env/web';
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  // Core routes of your application
  // Updated to match navigation constants and actual pages
  const routes = [
    '',
    '/about',
    '/academy',
    '/careers',
    '/club',
    '/contact',
    '/faq',
    '/megastore',
    '/plus',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
