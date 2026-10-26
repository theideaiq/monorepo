import { Suspense } from "react";
import { PersonalPage } from "@/components/personal-page";
import { Ticket } from "@/components/screens/ticket";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.support.title"));

interface TicketPageProps {
  readonly params: Promise<{ id: string }>;
}

/** /help/<id>: a support ticket's conversation. */
const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;

  return (
    <PersonalPage>
      <Suspense fallback={<SectionSpinner />}>
        <Ticket ticketId={decodeURIComponent(id)} />
      </Suspense>
    </PersonalPage>
  );
};

export default TicketPage;
