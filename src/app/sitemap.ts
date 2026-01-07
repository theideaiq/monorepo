import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theideaiq.com';

  // Core routes of your application
  const routes = [
    '',
    '/jukebox',
    '/club',
    '/academy',
    '/business',
    '/megastore',
    '/loyalty',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'yearly' : 'monthly',
    priority: route === '' ? 1 : 0.8,
  }));
}
