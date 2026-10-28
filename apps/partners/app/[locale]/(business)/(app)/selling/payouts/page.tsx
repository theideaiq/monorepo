import { Suspense } from "react";
import { ShopPayouts } from "@/components/screens/shop-payouts";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopPayouts.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopPayouts />
  </Suspense>
);

export default Page;
