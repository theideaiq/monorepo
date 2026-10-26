import { Suspense } from "react";
import { Affiliate } from "@/components/screens/affiliate";
import { Bulbs } from "@/components/screens/bulbs";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.bulbs.title"));

/** Your Pass → Bulbs: balance and history, then invites and affiliates. */
const BulbsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <div className="flex flex-col gap-10">
      <Bulbs />
      <Affiliate />
    </div>
  </Suspense>
);

export default BulbsPage;
