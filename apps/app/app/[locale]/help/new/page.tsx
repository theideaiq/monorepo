import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { NewTicket } from "@/components/screens/new-ticket";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.support.new.title"));

/** /help/new: a new support ticket. */
const NewTicketPage = () => (
  <PersonalPage>
    <Suspense fallback={<SectionSpinner />}>
      <NewTicket />
    </Suspense>
  </PersonalPage>
);

export default NewTicketPage;
