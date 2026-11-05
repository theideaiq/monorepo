import { Suspense } from "react";
import { Today } from "@/components/screens/today";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.nav.today"));

const TodayPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Today />
  </Suspense>
);

export default TodayPage;
