import { Suspense } from "react";
import { Procurement } from "@/components/screens/procurement";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.procurement.title")
);

const ProcurementPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Procurement />
  </Suspense>
);

export default ProcurementPage;
