import type { Product } from '@/services/products';

interface ProductJsonLdProps {
  product: Product;
  url: string;
}

/**
 * Injects Product JSON-LD Structured Data into the product page.
 * Critical for SEO: Helps search engines display rich snippets (price, reviews, availability).
 */
export default function ProductJsonLd({ product, url }: ProductJsonLdProps) {
  // Use the first variant's SKU if available, otherwise fallback to product id
  const sku = product.variants?.[0]?.sku || product.id;

  // Construct Offers
  const offers = {
    '@type': 'Offer',
    priceCurrency: 'IQD', // Based on the currency displayed in ProductView
    price: product.price,
    itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: url,
    seller: {
      '@type': 'Organization',
      name: product.seller,
    },
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images.length > 0 ? product.images : [product.image],
    description: product.description,
    sku: sku,
    brand: {
      '@type': 'Brand',
      name: product.seller,
    },
    offers: offers,
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: 1, // We don't have review count in the model, defaulting to 1 if rating exists
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
