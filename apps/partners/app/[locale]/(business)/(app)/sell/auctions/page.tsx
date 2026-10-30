import { Suspense } from "react";
import { ShopAuctions } from "@/components/screens/shop-auctions";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.shopAuctions.title")
);

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <ShopAuctions />
  </Suspense>
);

export default Page;
