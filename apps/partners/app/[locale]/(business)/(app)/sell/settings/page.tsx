import { Suspense } from "react";
import { Selling } from "@/components/screens/selling";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.shopSettings"));

const ShopSettingsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Selling />
  </Suspense>
);

export default ShopSettingsPage;
