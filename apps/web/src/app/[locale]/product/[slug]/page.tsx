import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductView } from '@/components/store/ProductView';
import { getProductBySlug } from '@/services/products';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.title,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    openGraph: {
      images: product.image ? [product.image] : [],
    },
  };
}

// Ensure this dynamic route doesn't break static mobile export
export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [product.image, ...product.images] : [],
    description: product.description,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'IQD',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://theidea.iq/product/${product.slug}`,
    },
    aggregateRating:
      product.rating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: 1, // Fallback if no specific reviews
          }
        : undefined,
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 pt-24">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw injection and is sanitized */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <ProductView product={product} />
    </div>
  );
}
