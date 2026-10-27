import { Suspense } from "react";
import { TeamPlus } from "@/components/screens/team-plus";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.company.plus.title"));

const TeamPlusPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <TeamPlus />
  </Suspense>
);

export default TeamPlusPage;
