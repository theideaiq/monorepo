import { Suspense } from "react";
import { Supply } from "@/components/screens/supply";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.supply"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Supply />
  </Suspense>
);

export default Page;
