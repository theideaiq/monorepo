import { Suspense } from "react";
import { Invoices } from "@/components/screens/invoices";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.suite.invoices.title"));

const InvoicesPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Invoices />
  </Suspense>
);

export default InvoicesPage;
