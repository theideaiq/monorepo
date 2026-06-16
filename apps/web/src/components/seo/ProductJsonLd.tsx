import { webEnv } from '@repo/env/web';
import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  locale: string;
}

export default function ProductJsonLd({ product, locale }: ProductJsonLdProps) {
  const baseUrl = webEnv.NEXT_PUBLIC_SITE_URL;
  const url = `${baseUrl}/${locale}/product/${product.slug}`;

  // Use the first variant for SKU/Price if available, otherwise fallback to product defaults
  const mainVariant = product.variants?.[0];
  const price = mainVariant ? mainVariant.price : product.price;
  const sku = mainVariant?.sku ? mainVariant.sku : product.id;
  const availability =
    product.stock > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: sku,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      url: url,
      priceCurrency: 'IQD',
      price: price,
      availability: availability,
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        // Since product interface doesn't explicitly expose reviews array in Product,
        // we fallback to 1 so the rating schema remains valid if a rating exists.
        reviewCount: 1,
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
