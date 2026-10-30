import { Suspense } from "react";
import { Business } from "@/components/screens/business";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.today"));

const BusinessPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Business />
  </Suspense>
);

export default BusinessPage;
