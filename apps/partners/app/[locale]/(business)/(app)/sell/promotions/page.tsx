import { Suspense } from "react";
import { ShopSales } from "@/components/screens/shop-sales";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.promotions"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopSales />
  </Suspense>
);

export default Page;
