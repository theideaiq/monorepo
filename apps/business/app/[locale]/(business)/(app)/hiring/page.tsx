import { Suspense } from "react";
import { Hiring } from "@/components/screens/hiring";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.suite.hiring.title"));

const HiringPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Hiring />
  </Suspense>
);

export default HiringPage;
