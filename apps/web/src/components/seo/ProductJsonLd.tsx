import type { Product } from '@/services/products';

export default function ProductJsonLd({
  product,
  baseUrl,
}: {
  product: Product;
  baseUrl: string;
}) {
  const url = `${baseUrl}/product/${product.slug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image:
      product.images?.length > 0
        ? product.images
        : product.image
          ? [product.image]
          : [],
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller,
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
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller,
      },
    },
  };

  if (product.rating && product.rating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: 1,
    };
  }

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
