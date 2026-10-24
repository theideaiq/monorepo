import { Suspense } from "react";
import { Ticket } from "@/components/screens/ticket";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.support.title"));

const TicketPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Ticket />
  </Suspense>
);

export default TicketPage;
