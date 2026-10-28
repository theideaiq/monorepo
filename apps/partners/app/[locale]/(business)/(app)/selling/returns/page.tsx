import { Suspense } from "react";
import { ShopReturns } from "@/components/screens/shop-returns";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopReturns.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopReturns />
  </Suspense>
);

export default Page;
