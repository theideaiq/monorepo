import type { Product } from '@/services/products';

export default function ProductJsonLd({
  product,
  url,
}: {
  product: Product;
  url: string;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description,
    sku: product.variants?.[0]?.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
    aggregateRating:
      product.rating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: 1, // Fallback since actual review count isn't exposed yet
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
