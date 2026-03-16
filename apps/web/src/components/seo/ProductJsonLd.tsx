'use client';
import type { Product } from '@/services/products';

export default function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images,
    description: product.description,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: product.rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: 1,
    } : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
