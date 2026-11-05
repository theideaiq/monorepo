import { Suspense } from "react";
import { OrganizationSettings } from "@/components/screens/organization-settings";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.partners.settings.title")
);

const OrganizationSettingsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <OrganizationSettings />
  </Suspense>
);

export default OrganizationSettingsPage;
