import { Suspense } from "react";
import { Members } from "@/components/screens/members";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.partners.members.title")
);

const MembersPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Members />
  </Suspense>
);

export default MembersPage;
