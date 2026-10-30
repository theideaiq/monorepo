import { Suspense } from "react";
import { AffiliateScreen } from "@/components/screens/affiliate";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.affiliate"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <AffiliateScreen />
  </Suspense>
);

export default Page;
