'use client';

import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  baseUrl: string;
}

export default function ProductJsonLd({ product, baseUrl }: ProductJsonLdProps) {
  const url = `${baseUrl}/product/${product.slug}`;

  // Map variants to offers if they exist, otherwise use main product price
  const offers = product.variants && product.variants.length > 0
    ? product.variants.map((variant) => ({
        '@type': 'Offer',
        url: url,
        priceCurrency: 'IQD',
        price: variant.price,
        itemCondition: 'https://schema.org/NewCondition', // Assuming all are new for this simple example based on condition mapping logic
        availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        sku: variant.sku,
      }))
    : {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'IQD',
        price: product.price,
        itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images && product.images.length > 0 ? product.images : [product.image],
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'The IDEA', // The IDEA is the brand/seller
    },
    offers: offers,
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.rating > 0 ? 1 : 0, // Mock review count based on if there's a rating, or omit if real count isn't available
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
