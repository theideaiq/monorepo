import type { Product } from '@/services/products';

export default function ProductJsonLd({ product, url }: { product: Product, url: string }) {
  const isAvailable = product.stock > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.variants?.[0]?.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'IQD',
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: url,
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: 1, // Fallback since actual count isn't in Product UI type yet
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
