import { Suspense } from "react";
import { Listings } from "@/components/screens/listings";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) =>
  t("app.company.listings.title")
);

const ListingsPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Listings />
  </Suspense>
);

export default ListingsPage;
