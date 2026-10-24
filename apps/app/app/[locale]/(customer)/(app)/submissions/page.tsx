import { Suspense } from "react";
import { Submissions } from "@/components/screens/submissions";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.submissions.title"));

const SubmissionsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Submissions />
  </Suspense>
);

export default SubmissionsPage;
