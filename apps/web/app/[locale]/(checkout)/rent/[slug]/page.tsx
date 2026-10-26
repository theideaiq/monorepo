import { Suspense } from "react";
import { RentCheckout } from "@/components/screens/rent-checkout";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.rent.title"));

interface RentPageProps {
  readonly params: Promise<{ slug: string }>;
}

/** /rent/<slug>: renting one item on its own (rent and deposit). */
const RentPage = async ({ params }: RentPageProps) => {
  const { slug } = await params;

  return (
    <Suspense fallback={<SectionSpinner />}>
      <RentCheckout slug={decodeURIComponent(slug)} />
    </Suspense>
  );
};

export default RentPage;
