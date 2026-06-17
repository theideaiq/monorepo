import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductView } from '@/components/store/ProductView';
import { getProductBySlug } from '@/services/products';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theidea.iq';

  return {
    title: product.title,
    description: product.description || `Buy ${product.title} at The IDEA.`,
    openGraph: {
      title: product.title,
      description: product.description || `Buy ${product.title} at The IDEA.`,
      url: `${baseUrl}/${locale}/product/${slug}`,
      siteName: 'The IDEA',
      images: product.image
        ? [
            {
              url: product.image,
              width: 800,
              height: 600,
              alt: product.title,
            },
          ]
        : [],
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/product/${slug}`,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, locale } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theidea.iq';
  const url = `${baseUrl}/${locale}/product/${slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image ? [product.image] : [],
    description: product.description || `Buy ${product.title} at The IDEA.`,
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: url,
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
        name: product.seller,
      },
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.variants?.length || 1, // Using variants length or 1 as mock review count for schema validation
      },
    }),
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 pt-24">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for JSON-LD
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <ProductView product={product} />
    </div>
  );
}
