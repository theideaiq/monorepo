import { Suspense } from "react";
import { Affiliate } from "@/components/screens/affiliate";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.affiliate.title"));

const AffiliatePage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Affiliate />
  </Suspense>
);

export default AffiliatePage;
