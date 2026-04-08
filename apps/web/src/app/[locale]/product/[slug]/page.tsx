import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getProductBySlug } from '@/services/products';
import { ProductView } from '@/components/store/ProductView';

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

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Prepare JSON-LD Product schema
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.image,
    description: product.description,
    sku: product.slug || product.id,
    brand: {
      '@type': 'Brand',
      name: product.seller,
    },
    offers: {
      '@type': 'Offer',
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
        bestRating: '5',
        worstRating: '1',
      },
    }),
  };

  const jsonLd = JSON.stringify(productSchema).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="container mx-auto px-4 py-8 md:py-16 pt-24">
        <ProductView product={product} />
      </div>
    </>
  );
}
