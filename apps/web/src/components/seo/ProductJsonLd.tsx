import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

export default function ProductJsonLd({ product }: { product: Product }) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const url = `${baseUrl}/product/${product.slug}`;

  // Use the first image or a fallback from URL if it exists
  const image = product.image ? [product.image, ...(product.images || [])] : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.rating > 0 ? 1 : 0, // Fallback since we don't have review count in UI
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
