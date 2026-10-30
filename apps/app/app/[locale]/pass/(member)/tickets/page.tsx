import { Tickets } from "@/components/pass/your-club";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.tickets.title"));

/** `/pass/tickets`: the events the member is going to. */
const TicketsPage = () => <Tickets />;

export default TicketsPage;
