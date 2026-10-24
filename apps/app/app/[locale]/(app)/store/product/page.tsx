import { Suspense } from "react";
import { Product } from "@/components/screens/product";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.store.title"));

const ProductPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Product />
  </Suspense>
);

export default ProductPage;
