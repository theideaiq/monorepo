import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  baseUrl: string;
}

export default function ProductJsonLd({
  product,
  baseUrl,
}: ProductJsonLdProps) {
  // Use first variant SKU if available, otherwise use product ID
  const sku =
    product.variants && product.variants.length > 0 && product.variants[0]
      ? product.variants[0].sku
      : product.id;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images.length > 0 ? product.images : [product.image],
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: sku,
    brand: {
      '@type': 'Brand',
      name: 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/product/${product.slug}`,
      priceCurrency: 'IQD',
      price: product.price,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: 1, // Providing a default of 1 if there's a rating, schema expects it
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
