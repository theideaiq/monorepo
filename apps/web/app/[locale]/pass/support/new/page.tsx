import { Suspense } from "react";
import { NewTicket } from "@/components/screens/new-ticket";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.support.new.title"));

const NewTicketPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <NewTicket />
  </Suspense>
);

export default NewTicketPage;
