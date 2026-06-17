import { safeJsonLdStringify } from '@repo/utils';
import type { Product } from '@/services/products';

export function ProductJsonLd({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [product.image, ...(product.images || [])] : [],
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: `https://theidea.iq/product/${product.slug}`,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: product.condition === 'new'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
    />
  );
}
