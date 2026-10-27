import { Suspense } from "react";
import { Wishlist } from "@/components/screens/wishlist";
import { SectionSpinner } from "@/components/states";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.wishlist.title"));

/** Your Pass → Saved: the items the member hearted on product pages. */
const SavedPage = () => (
  <Suspense fallback={<SectionSpinner />}>
    <Wishlist />
  </Suspense>
);

export default SavedPage;
