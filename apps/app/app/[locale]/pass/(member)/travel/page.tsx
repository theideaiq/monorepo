import { Kits } from "@/components/travel/kits";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.travel.kits.title"));

/** `/pass/travel`: the member's Travel Kits, one folder per trip. */
const TravelKitsPage = () => <Kits />;

export default TravelKitsPage;
