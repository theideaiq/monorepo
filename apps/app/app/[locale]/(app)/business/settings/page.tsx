import { Suspense } from "react";
import { BusinessSettings } from "@/components/screens/business-settings";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.business.settings.title")
);

const BusinessSettingsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <BusinessSettings />
  </Suspense>
);

export default BusinessSettingsPage;
