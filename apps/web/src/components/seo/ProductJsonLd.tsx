import type { Product } from '@/services/products';

/**
 * Injects JSON-LD Structured Data for a Product into the page head.
 * Critical for SEO: Enables Rich Snippets (Price, Availability, Image) in search results.
 *
 * @param product - The product data to generate schema for.
 */
export default function ProductJsonLd({ product }: { product: Product }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theidea.iq';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.length > 0 ? product.images : [product.image],
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller || 'The IDEA',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'IQD',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/product/${product.slug}`,
      itemCondition:
        product.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
    // Note: AggregateRating omitted as reviewCount is not currently available in Product interface.
  };

  const jsonString = JSON.stringify(schema);
  // Sanitize JSON string to prevent XSS (closing script tags, etc.)
  // We strictly escape < to \u003c to prevent any HTML injection
  const safeJsonString = jsonString.replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe after sanitization
      dangerouslySetInnerHTML={{ __html: safeJsonString }}
    />
  );
}
