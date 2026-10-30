import { RentalHistory } from "@/components/pass/rentals";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.pass.history.title"));

/** `/pass/history`: past Plus rentals. */
const HistoryPage = () => <RentalHistory />;

export default HistoryPage;
