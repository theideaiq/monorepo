import { Suspense } from "react";
import { Applications } from "@/components/pass/your-club";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.pass.applications.title")
);

/** `/pass/applications`: applications, surveys made, submissions, follows. */
const ApplicationsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Applications />
  </Suspense>
);

export default ApplicationsPage;
