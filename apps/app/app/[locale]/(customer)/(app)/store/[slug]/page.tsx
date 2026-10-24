import { Suspense } from "react";
import { Product } from "@/components/screens/product";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.store.title"));

interface ProductPageProps {
  readonly params: Promise<{ slug: string }>;
}

/** /store/<slug>: a product (`?add=1` from the website adds one copy). */
const ProductPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params;

  return (
    <Suspense fallback={<SectionSpinner />}>
      <Product slug={decodeURIComponent(slug)} />
    </Suspense>
  );
};

export default ProductPage;
