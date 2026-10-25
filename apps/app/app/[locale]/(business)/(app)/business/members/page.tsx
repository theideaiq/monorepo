import { Suspense } from "react";
import { BusinessMembers } from "@/components/screens/business-members";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.business.members.title")
);

const BusinessMembersPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <BusinessMembers />
  </Suspense>
);

export default BusinessMembersPage;
