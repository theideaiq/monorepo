import { Suspense } from "react";
import { Selling } from "@/components/screens/selling";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.selling.title"));

/** Your Pass → Selling: ask shops for offers on your own things. */
const SellingPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Selling />
  </Suspense>
);

export default SellingPage;
