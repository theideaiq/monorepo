'use client';

import { webEnv } from '@repo/env/web';
import { safeJsonLdStringify } from '@repo/utils';
import { usePathname } from 'next/navigation';

export default function BreadcrumbJsonLd() {
  const pathname = usePathname();
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;

  // Split pathname into segments and remove empty strings
  // Example: "/en/about/team" -> ["en", "about", "team"]
  const segments = pathname.split('/').filter(Boolean);

  // If no segments, return null (shouldn't happen with locale in path)
  if (segments.length === 0) return null;

  const itemListElement = segments.map((segment, index) => {
    // Construct the URL for this breadcrumb item
    // We join all segments up to the current one
    // Prepend slash to make it a valid path
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const url = `${baseUrl}${path}`;

    let name =
      decodeURIComponent(segment).charAt(0).toUpperCase() +
      decodeURIComponent(segment).slice(1);

    // If it's the first segment, it's the locale (e.g., "en" or "ar")
    // We display it as "Home" in the breadcrumb trail
    if (index === 0) {
      name = 'Home';
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      name: name,
      item: url,
    };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safely escaped
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
