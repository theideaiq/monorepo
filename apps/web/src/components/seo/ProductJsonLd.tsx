import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
}

export default function ProductJsonLd({ product }: ProductJsonLdProps) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const url = `${baseUrl}/product/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images && product.images.length > 0 ? product.images : [product.image],
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'IQD',
      price: product.price,
      itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: product.seller || 'The IDEA'
      }
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: 1 // Fallback since we don't have total reviews count in the type, but rating implies at least 1
      }
    })
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
