import { Suspense } from "react";
import { ShopGetOffers } from "@/components/screens/shop-get-offers";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopGetOffers.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopGetOffers />
  </Suspense>
);

export default Page;
