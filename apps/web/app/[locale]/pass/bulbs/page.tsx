import { Suspense } from "react";
import { Bulbs } from "@/components/screens/bulbs";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.bulbs.title"));

const BulbsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Bulbs />
  </Suspense>
);

export default BulbsPage;
