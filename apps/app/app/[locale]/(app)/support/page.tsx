import { Suspense } from "react";
import { Support } from "@/components/screens/support";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.support.title"));

const SupportPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Support />
  </Suspense>
);

export default SupportPage;
