import { Suspense } from "react";
import { PickupLocations } from "@/components/screens/pickup-locations";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("app.company.pickup.title"));

const Page = () => (
  <Suspense fallback={<SectionSpinner />}>
    <PickupLocations />
  </Suspense>
);

export default Page;
