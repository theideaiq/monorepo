import { KitFolder } from "@/components/travel/kit-folder";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.travel.kit.kicker"));

interface TravelKitPageProps {
  readonly params: Promise<{ kitId: string }>;
}

/** `/pass/travel/<kitId>`: one Travel Kit, the member's folder for a trip. */
const TravelKitPage = async ({ params }: TravelKitPageProps) => {
  const { kitId } = await params;
  return <KitFolder kitId={decodeURIComponent(kitId)} />;
};

export default TravelKitPage;
