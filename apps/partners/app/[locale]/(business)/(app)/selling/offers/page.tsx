import { Suspense } from "react";
import { ShopOffers } from "@/components/screens/shop-offers";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopOffers.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopOffers />
  </Suspense>
);

export default Page;
