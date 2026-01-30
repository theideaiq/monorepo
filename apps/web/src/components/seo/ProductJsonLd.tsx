import { webEnv as env } from '@repo/env/web';
import type { Product } from '@/services/products';

type Props = {
  product: Product;
  locale: string;
};

export default function ProductJsonLd({ product, locale }: Props) {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;
  // Construct canonical URL including locale
  const canonicalUrl = `${baseUrl}/${locale}/product/${product.slug}`;

  // biome-ignore lint/suspicious/noExplicitAny: JSON-LD structure
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image:
      product.images && product.images.length > 0
        ? product.images
        : [product.image],
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
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
        name: product.seller || 'The IDEA',
      },
    },
  };

  if (product.reviewCount && product.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe and required by Google
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
