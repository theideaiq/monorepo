import { Suspense } from "react";
import { Sell } from "@/components/screens/sell";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.sell.title"));

const SellPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Sell />
  </Suspense>
);

export default SellPage;
