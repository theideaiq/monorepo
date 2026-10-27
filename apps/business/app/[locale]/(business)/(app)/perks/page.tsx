import { Suspense } from "react";
import { PartnerPerks } from "@/components/screens/partner-perks";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.company.perks.title"));

const PerksPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <PartnerPerks />
  </Suspense>
);

export default PerksPage;
