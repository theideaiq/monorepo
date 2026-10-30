import { Suspense } from "react";
import { Family } from "@/components/pass/family";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.family.title"));

/**
 * `/pass/family`: the Family on one Plus plan (a guardian's code opens it
 * with `?guardian=<code>`, read by the guardian card).
 */
const FamilyPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Family />
  </Suspense>
);

export default FamilyPage;
