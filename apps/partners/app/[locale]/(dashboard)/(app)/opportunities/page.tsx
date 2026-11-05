import { Suspense } from "react";
import { Opportunities } from "@/components/screens/opportunities";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.opportunities"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Opportunities />
  </Suspense>
);

export default Page;
