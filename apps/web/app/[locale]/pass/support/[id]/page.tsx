import { Suspense } from "react";
import { Ticket } from "@/components/screens/ticket";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.support.title"));

interface TicketPageProps {
  readonly params: Promise<{ id: string }>;
}

/** /support/<id>: a ticket's conversation. */
const TicketPage = async ({ params }: TicketPageProps) => {
  const { id } = await params;

  return (
    <Suspense fallback={<SectionSpinner />}>
      <Ticket ticketId={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default TicketPage;
