import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductJsonLd from '@/components/seo/ProductJsonLd';
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

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="container mx-auto px-4 py-8 md:py-16 pt-24">
        <ProductView product={product} />
      </div>
    </>
  );
}
