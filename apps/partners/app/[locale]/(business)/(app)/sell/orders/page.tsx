import { Suspense } from "react";
import { ShopOrders } from "@/components/screens/shop-orders";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopOrders.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopOrders />
  </Suspense>
);

export default Page;
