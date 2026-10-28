import { Suspense } from "react";
import { Selling } from "@/components/screens/selling";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.selling.title")
);

const SellingPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Selling />
  </Suspense>
);

export default SellingPage;
