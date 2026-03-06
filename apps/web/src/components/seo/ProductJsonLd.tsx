import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

export default function ProductJsonLd({ product }: { product: Product }) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const canonicalUrl = `${baseUrl}/product/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image.startsWith('http')
      ? product.image
      : `${baseUrl}${product.image}`,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition', // Assuming new based on condition checking elsewhere, or could dynamically map
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: 1, // Fallback, could be actual count if available
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
