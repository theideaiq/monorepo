import { Suspense } from "react";
import { Plus } from "@/components/screens/plus";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.plus.title"));

const PlusPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Plus />
  </Suspense>
);

export default PlusPage;
