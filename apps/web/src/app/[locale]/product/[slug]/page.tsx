import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { webEnv } from '@repo/env/web';
import { getProductBySlug } from '@/services/products';
import { ProductView } from '@/components/store/ProductView';
import ProductJsonLd from '@/components/seo/ProductJsonLd';

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
  const { slug, locale } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const url = `${webEnv.NEXT_PUBLIC_SITE_URL}/${locale}/product/${slug}`;

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 pt-24">
      <ProductJsonLd product={product} url={url} />
      <ProductView product={product} />
    </div>
  );
}
