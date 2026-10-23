import { Suspense } from "react";
import { NewOrganization } from "@/components/screens/new-organization";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.organizations.new.title")
);

const NewOrganizationPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <NewOrganization />
  </Suspense>
);

export default NewOrganizationPage;
