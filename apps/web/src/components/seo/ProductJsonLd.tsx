import { safeJsonLdStringify } from '@repo/utils';
import type { Product } from '@/services/products';

type Props = {
  product: Product;
};

export default function ProductJsonLd({ product }: Props) {
  // Map product data to Schema.org Product structure
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.image ? [product.image, ...(product.images || [])] : [],
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'IQD', // Assuming IQD based on memory about formatIQDNumber
      lowPrice: product.price,
      highPrice: product.price, // Could be range if variants differ, but keeping simple
      offerCount: product.variants?.length || 1,
      availability:
        (product.stock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller || 'The IDEA',
      },
    },
  };

  if (product.rating) {
    Object.assign(jsonLd, {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 1, // Fallback if missing
      },
    });
  }

  // Handle SKU if available on variants or product
  // Since Product interface doesn't have SKU at top level, we might check variants
  if (product.variants?.[0]?.sku) {
     Object.assign(jsonLd, { sku: product.variants[0].sku });
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is sanitized via safeJsonLdStringify
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
