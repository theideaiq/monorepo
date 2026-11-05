import { Suspense } from "react";
import { ProcurementRequest } from "@/components/screens/procurement-request";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.procurement.title")
);

interface ProcurementRequestPageProps {
  readonly params: Promise<{ id: string }>;
}

const ProcurementRequestPage = async ({
  params,
}: ProcurementRequestPageProps) => {
  const { id } = await params;
  return (
    <Suspense fallback={<SectionSpinner />}>
      <ProcurementRequest requestId={id} />
    </Suspense>
  );
};

export default ProcurementRequestPage;
