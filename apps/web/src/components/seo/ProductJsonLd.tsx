import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  baseUrl?: string;
}

export default function ProductJsonLd({
  product,
  baseUrl,
}: ProductJsonLdProps) {
  const url = baseUrl ? `${baseUrl}/product/${product.slug}` : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: [product.image, ...product.images].filter(Boolean),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller,
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'IQD',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: url,
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount || 1,
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
