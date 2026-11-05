import { Suspense } from "react";
import { Billing } from "@/components/screens/billing";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("billing.title"));

const BillingPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Billing />
  </Suspense>
);

export default BillingPage;
