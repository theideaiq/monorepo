'use client';

/**
 * Injects JSON-LD Structured Data into the page head.
 * Critical for SEO: Helps search engines understand the Organization and Website identity.
 *
 * Renders:
 * - Organization Schema (Logo, Address, Contact)
 * - WebSite Schema (Search Action, Name)
 *
 * @param baseUrl - The canonical base URL of the site (e.g., https://theidea.iq)
 */
export default function JsonLd({ baseUrl }: { baseUrl: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'The IDEA',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/icon.svg`,
        },
        description:
          "Innovation for Every Aspect of Life - Baghdad's premier digital ecosystem.",
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Baghdad',
          addressCountry: 'IQ',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: `${baseUrl}/contact`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'The IDEA',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/megastore?filter={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
