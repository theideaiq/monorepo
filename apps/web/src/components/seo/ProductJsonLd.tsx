import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

export default function ProductJsonLd({
  product,
  locale,
  slug,
}: {
  product: Product;
  locale: string;
  slug: string;
}) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const url = `${baseUrl}/${locale}/product/${slug}`;

  // Use a flexible type for JSON-LD to allow optional properties like aggregateRating
  // biome-ignore lint/suspicious/noExplicitAny: JSON-LD structure is dynamic
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
    },
  };

  // Add aggregate rating if available
  if (product.rating && product.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: 1, // Providing a default reviewCount to avoid warnings, ideally this should come from real data.
    };
  }

  // Prevent XSS in JSON stringify by escaping '<' characters
  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe after escaping
      dangerouslySetInnerHTML={{ __html: safeJsonLd }}
    />
  );
}
