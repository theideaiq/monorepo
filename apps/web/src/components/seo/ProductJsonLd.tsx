import { Product } from '@/services/products';

export default function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    image: product.images.length > 0 ? product.images : [product.image],
    sku: product.id,
    offers: {
      '@type': 'Offer',
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
  };

  // Add aggregate rating if available
  if (product.rating > 0) {
    (jsonLd as any).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      // Default to 1 review if rating exists but review count isn't in model
      reviewCount: 1,
    };
  }

  const jsonString = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
