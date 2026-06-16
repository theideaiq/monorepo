import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

interface Props {
  product: Product;
  locale?: string;
}

export default function ProductJsonLd({ product, locale = 'en' }: Props) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  // Construct URL for the product
  const productUrl = `${baseUrl}/${locale}/product/${product.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images && product.images.length > 0 ? product.images : [product.image],
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'IQD',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    },
    aggregateRating: product.rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 1,
    } : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required for SEO
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
