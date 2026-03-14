'use client';

import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  baseUrl: string;
}

export default function ProductJsonLd({
  product,
  baseUrl,
}: ProductJsonLdProps) {
  const productUrl = `${baseUrl}/product/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
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
        bestRating: '5',
        worstRating: '1',
        ratingCount: 1, // Defaulting to 1 as we don't have review count in the interface right now
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for JSON-LD
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
